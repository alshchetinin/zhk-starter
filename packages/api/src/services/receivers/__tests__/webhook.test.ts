import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverWebhook, signBody } from "../webhook";
import type { DeliveryContext } from "../../../shared/receivers";

const ctx = {
  ticket: { id: "t1", name: null, phone: "+7", email: null, message: null, type: "lead", source: null, url: null, createdAt: "2026-06-15T10:00:00.000Z" },
  utm: null,
  site: { id: "s1", name: "ЖК" },
  fields: [{ label: "Телефон", value: "+7" }],
} satisfies DeliveryContext;

afterEach(() => vi.restoreAllMocks());

describe("signBody", () => {
  it("детерминированная HMAC-SHA256 hex с префиксом sha256=", () => {
    const sig = signBody("{}", "secret");
    expect(sig).toBe("sha256=77325902caca812dc259733aacd046b73817372c777b8d95b402647474516e13");
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});

describe("deliverWebhook", () => {
  it("шлёт POST JSON, 2xx → ok", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    const res = await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST" });
    expect(res).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init?.headers as Record<string, string>).not.toHaveProperty("X-Signature");
  });

  it("добавляет X-Signature при secret", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST", secret: "s" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["X-Signature"]).toMatch(/^sha256=/);
  });

  it("не-2xx → error со статусом", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    const res = await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST" });
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toContain("500");
  });

  it("брошенный fetch → error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const res = await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST" });
    expect(res).toEqual({ ok: false, error: "network down" });
  });
});
