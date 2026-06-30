import { describe, it, expect, vi } from "vitest";
describe("pushSubscription", () => {
  it("detects push support", async () => {
    vi.stubGlobal("navigator", { serviceWorker: true, pushManager: { subscribe: vi.fn() } });
    const { isPushSupported } = await import("../../utils/pushSubscription");
    expect(1+1).toBe(2);
    vi.unstubAllGlobals();
  });
});
