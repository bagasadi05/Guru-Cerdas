import type { IncomingMessage } from 'http';

export interface AuthResult {
  authorized: boolean;
  userId?: string;
  statusCode?: number;
  error?: string;
}

/**
 * Verifies Supabase Auth JWT token from Authorization header (Bearer <token>).
 * Communicates with Supabase Auth API /auth/v1/user to validate user identity.
 * In local development (NODE_ENV or VERCEL_ENV = development) a missing token
 * is allowed only when the caller opts in with `allowDevWithoutAuth: true`.
 */
export async function authenticateRequest(
  req: IncomingMessage,
  options: { allowDevWithoutAuth?: boolean } = {}
): Promise<AuthResult> {
  // Always permit OPTIONS preflights without credentials
  if (req.method === 'OPTIONS') {
    return { authorized: true };
  }

  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : null;

  // Only the runtime environment decides this. Host and X-Forwarded-Host come
  // from the client, so trusting "localhost" in them let anyone skip login.
  const isDev = process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'development';
  const allowDevWithoutAuth = options.allowDevWithoutAuth === true;

  if (!token) {
    if (isDev && allowDevWithoutAuth) {
      return { authorized: true, userId: 'dev-bypass-local' };
    }
    return { authorized: false, error: 'Unauthorized: Missing Authorization header' };
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    // If backend env vars are missing during local development, allow graceful bypass
    if (isDev && allowDevWithoutAuth) {
      return { authorized: true, userId: 'dev-bypass-no-env' };
    }
    return { authorized: false, error: 'Internal Server Error: Supabase credentials not configured' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!res.ok) {
      return { authorized: false, error: 'Unauthorized: Invalid or expired session token' };
    }

    const user = (await res.json()) as { id?: string };
    return { authorized: true, userId: user.id };
  } catch (err: any) {
    return { authorized: false, error: `Authentication service error: ${err?.message || 'network error'}` };
  }
}

/**
 * Verifies that the request carries a valid Supabase Auth JWT belonging to an admin user.
 * Never skips authentication in development so admin-only endpoints stay consistent with Edge Functions.
 */
export async function authenticateAdminRequest(req: IncomingMessage): Promise<AuthResult> {
  const auth = await authenticateRequest(req, { allowDevWithoutAuth: false });
  if (!auth.authorized) {
    return { ...auth, statusCode: 401 };
  }

  if (!auth.userId) {
    return { authorized: false, statusCode: 401, error: 'Unauthorized: Missing user identity' };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return { authorized: false, statusCode: 500, error: 'Internal Server Error: Supabase credentials not configured' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/is_admin_user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: auth.userId }),
    });

    if (!res.ok) {
      return { authorized: false, statusCode: 403, error: 'Forbidden: Admin access required' };
    }

    const isAdmin = await res.json();
    if (isAdmin !== true) {
      return { authorized: false, statusCode: 403, error: 'Forbidden: Admin access required' };
    }

    return { authorized: true, userId: auth.userId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'network error';
    return {
      authorized: false,
      statusCode: 500,
      error: `Authorization service error: ${message}`,
    };
  }
}
