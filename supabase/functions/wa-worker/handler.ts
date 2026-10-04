type RpcResult = { data: unknown; error: unknown };
type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => PromiseLike<RpcResult>;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function matchesSecret(
  actual: string,
  expected: string,
): Promise<boolean> {
  if (!expected || actual.length > 512) return false;
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encode.encode(actual)),
    crypto.subtle.digest("SHA-256", encode.encode(expected)),
  ]);
  const first = new Uint8Array(a);
  const second = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < first.length; i++) difference |= first[i] ^ second[i];
  return difference === 0;
}

function requiredString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= maxLength;
}

function optionalString(value: unknown, maxLength: number): boolean {
  return value === undefined || value === null ||
    (typeof value === "string" && value.length <= maxLength);
}

export function createWorkerHandler(token: string, rpc: Rpc) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    if (!await matchesSecret(req.headers.get("X-Worker-Token") ?? "", token)) {
      return json({ error: "invalid worker token" }, 401);
    }
    const path = new URL(req.url).pathname;
    const match = path.match(
      /^\/(?:functions\/v1\/)?wa-worker\/(claim|complete|requeue|recover)\/?$/,
    );
    if (!match) return json({ error: "unknown operation" }, 404);
    const op = match[1];
    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      if (text.length > 16384) return json({ error: "request too large" }, 413);
      const value: unknown = text === "" && op === "recover"
        ? {}
        : JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return json({ error: "JSON object required" }, 400);
      }
      body = value as Record<string, unknown>;
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }

    let name: string;
    let args: Record<string, unknown>;
    if (op === "claim") {
      const batch = body.batch_size ?? 10;
      if (
        typeof batch !== "number" || !Number.isSafeInteger(batch) || batch < 1
      ) {
        return json({ error: "batch_size must be a positive integer" }, 400);
      }
      name = "worker_claim";
      args = {
        p_batch: Math.min(batch, 20),
        p_lease_minutes: 5,
        p_max_attempts: 3,
      };
    } else if (op === "recover") {
      name = "worker_recover";
      args = { p_lease_minutes: 5, p_max_attempts: 3 };
    } else {
      if (
        !requiredString(body.id, 256) ||
        !requiredString(body.claim_token, 128) ||
        !optionalString(body.error, 4000) || !optionalString(body.wa_id, 256)
      ) {
        return json({ error: "invalid id, claim_token, error or wa_id" }, 400);
      }
      args = {
        p_id: body.id,
        p_token: body.claim_token,
        p_error: body.error ?? null,
      };
      if (op === "complete") {
        if (body.status !== "sent" && body.status !== "failed") {
          return json({ error: "status must be sent or failed" }, 400);
        }
        name = "worker_complete";
        args.p_status = body.status;
        args.p_wa_id = body.wa_id ?? null;
      } else {
        name = "worker_requeue";
      }
    }
    try {
      const { data, error } = await rpc(name, args);
      if (error) {
        console.error("WhatsApp worker RPC failed", name);
        return json({ error: "worker database operation failed" }, 500);
      }
      if (op === "claim") return json({ messages: data ?? [] });
      if (op === "recover") return json({ requeued: data ?? 0 });
      if (data !== true) {
        return json(
          { error: "claim token mismatch or incompatible status" },
          409,
        );
      }
      return json({ ok: true });
    } catch {
      console.error("WhatsApp worker request failed", name);
      return json({ error: "worker database operation failed" }, 500);
    }
  };
}
