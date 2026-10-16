import { createWorkerHandler } from "./handler.ts";

const token = "test-worker-secret-not-for-production";
function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function request(op: string, body: unknown, secret = token): Request {
  return new Request(`https://example.com/functions/v1/wa-worker/${op}`, {
    method: "POST",
    headers: { "X-Worker-Token": secret },
    body: JSON.stringify(body),
  });
}

Deno.test("missing configuration and wrong tokens never reach RPC", async () => {
  let calls = 0;
  const rpc = () => {
    calls++;
    return Promise.resolve({ data: [], error: null });
  };
  assert(
    (await createWorkerHandler("", rpc)(request("claim", {}))).status === 401,
  );
  assert(
    (await createWorkerHandler(token, rpc)(request("claim", {}, "wrong")))
      .status === 401,
  );
  assert(calls === 0);
});

Deno.test("invalid bodies and batch sizes never reach RPC", async () => {
  let calls = 0;
  const handler = createWorkerHandler(token, () => {
    calls++;
    return Promise.resolve({ data: [], error: null });
  });
  for (
    const body of [null, [], { batch_size: 1.5 }, { batch_size: "10" }, {
      batch_size: -1,
    }]
  ) {
    assert((await handler(request("claim", body))).status === 400);
  }
  assert(
    (await handler(
      request("complete", { id: {}, claim_token: "token", status: "sent" }),
    )).status === 400,
  );
  assert(calls === 0);
});

Deno.test("claim reserves one message even when a legacy worker requests a batch", async () => {
  const handler = createWorkerHandler(token, (name, args) => {
    assert(name === "worker_claim");
    assert(
      args.p_batch === 1 && args.p_lease_minutes === 5 &&
        args.p_max_attempts === 3,
    );
    return Promise.resolve({ data: [{ id: "report" }], error: null });
  });
  const response = await handler(request("claim", { batch_size: 100 }));
  assert(response.status === 200);
  assert((await response.json()).messages[0].id === "report");
});

Deno.test("stale completion returns conflict and forwards only allowed arguments", async () => {
  const handler = createWorkerHandler(token, (name, args) => {
    assert(name === "worker_complete" && args.p_token === "stale");
    assert(!("phone" in args));
    return Promise.resolve({ data: false, error: null });
  });
  assert(
    (await handler(request("complete", {
      id: "report",
      claim_token: "stale",
      status: "sent",
      wa_id: "wa-message-id",
      phone: "unexpected",
    }))).status === 409,
  );
});

Deno.test("sent completion requires a delivery receipt before reaching RPC", async () => {
  let calls = 0;
  const handler = createWorkerHandler(token, () => {
    calls++;
    return Promise.resolve({ data: true, error: null });
  });
  for (const wa_id of [undefined, null, "", "   "]) {
    assert((await handler(request("complete", {
      id: "report", claim_token: "claim", status: "sent", wa_id,
    }))).status === 400);
  }
  assert(calls === 0);
});

Deno.test("health uses an authenticated aggregate RPC", async () => {
  let calls = 0;
  const handler = createWorkerHandler(token, (name, args) => {
    calls++;
    assert(name === "worker_delivery_health" && Object.keys(args).length === 0);
    return Promise.resolve({ data: { expected: 20, sent: 2, needs_attention: true }, error: null });
  });
  assert((await handler(request("health", {}, "wrong"))).status === 401);
  const response = await handler(request("health", {}));
  assert(response.status === 200 && (await response.json()).needs_attention);
  assert(calls === 1);
});

Deno.test("database errors stay private and rejected RPC promises return 500", async () => {
  const handler = createWorkerHandler(token, () =>
    Promise.resolve({
      data: null,
      error: { message: "sensitive database error" },
    }));
  const response = await handler(request("recover", {}));
  assert(
    response.status === 500 && !(await response.text()).includes("sensitive"),
  );
  const throwing = createWorkerHandler(
    token,
    () => Promise.reject(new Error("private")),
  );
  assert((await throwing(request("recover", {}))).status === 500);
});

Deno.test("requeue and recovery preserve the worker response contract", async () => {
  const handler = createWorkerHandler(token, (name, args) => {
    if (name === "worker_requeue") {
      assert(args.p_id === "report" && args.p_token === "active");
      return Promise.resolve({ data: true, error: null });
    }
    assert(name === "worker_recover" && args.p_max_attempts === 3);
    return Promise.resolve({ data: 2, error: null });
  });
  assert(
    (await (await handler(
      request("requeue", { id: "report", claim_token: "active" }),
    )).json()).ok,
  );
  assert((await (await handler(request("recover", {}))).json()).requeued === 2);
});
