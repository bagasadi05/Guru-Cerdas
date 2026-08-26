import type { IncomingMessage } from 'http';

export interface AuthResult {
  authorized: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verifies Supabase Auth JWT token from Authorization header (Bearer <token>).
 * Communicates with Supabase Auth API /auth/v1/user to validate user identity.
 * In local dev without token, allows fallback to support development workflows.
 */
export async function authenticateRequest(
  req: IncomingMessage,
  options: { allowDevWithoutAuth?: boolean } = { allowDevWithoutAuth: true }
): Promise<AuthResult> {
  // Always permit OPTIONS preflights without credentials
  if (req.method === 'OPTIONS') {
    return { authorized: true };
  }

  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : null;

  const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
  const isDev = process.env.NODE_ENV === 'development' ||
    host.includes('localhost') ||
    host.includes('127.0.0.1');

  if (!token) {
    if (isDev && options.allowDevWithoutAuth) {
      return { authorized: true, userId: 'dev-bypass-local' };
    }
    return { authorized: false, error: 'Unauthorized: Missing Authorization header' };
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    // If backend env vars are missing during local development, allow graceful bypass
    if (isDev && options.allowDevWithoutAuth) {
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
