import { describe, expect, it } from "vitest";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { consume } from "../limiter";

function memLimiter(points: number, duration: number) {
  return new RateLimiterMemory({ points, duration });
}

describe("consume", () => {
  it("разрешает до лимита, отклоняет после", async () => {
    const limiter = memLimiter(2, 60);
    const key = "ip:1.1.1.1";

    const a = await consume(limiter, key, "open");
    expect(a.allowed).toBe(true);
    expect(a.remaining).toBe(1);

    const b = await consume(limiter, key, "open");
    expect(b.allowed).toBe(true);
    expect(b.remaining).toBe(0);

    const c = await consume(limiter, key, "open");
    expect(c.allowed).toBe(false);
    expect(c.retryAfterSec).toBeGreaterThan(0);
    expect(c.limit).toBe(2);
  });

  it("разные ключи не мешают друг другу", async () => {
    const limiter = memLimiter(1, 60);
    expect((await consume(limiter, "ip:a", "open")).allowed).toBe(true);
    expect((await consume(limiter, "ip:b", "open")).allowed).toBe(true);
    expect((await consume(limiter, "ip:a", "open")).allowed).toBe(false);
  });

  it("при ошибке лимитера failMode=open → allowed:true", async () => {
    const broken = { consume: () => Promise.reject(new Error("redis down")) } as never;
    const res = await consume(broken, "k", "open");
    expect(res.allowed).toBe(true);
  });

  it("при ошибке лимитера failMode=closed → allowed:false", async () => {
    const broken = { consume: () => Promise.reject(new Error("redis down")) } as never;
    const res = await consume(broken, "k", "closed");
    expect(res.allowed).toBe(false);
  });
});
