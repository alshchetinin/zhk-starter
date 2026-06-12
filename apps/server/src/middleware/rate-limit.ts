import type { Context, Next } from "hono";
import { env } from "@zhk/env/server";
import { consume, createLimiter, getClientIp } from "@zhk/ratelimit";

let ceiling: ReturnType<typeof createLimiter> | null = null;
function getCeiling() {
  if (!ceiling) ceiling = createLimiter("honoCeiling", env as unknown as Record<string, unknown>);
  return ceiling;
}

/** Грубый per-IP потолок против флуда любого маршрута. fail-open. */
export async function rateLimitCeiling(c: Context, next: Next) {
  if (!env.RL_ENABLED) return next();
  const ip = getClientIp(c.req.raw.headers);
  const decision = await consume(getCeiling(), ip, "open");
  if (!decision.allowed) {
    c.header("Retry-After", String(decision.retryAfterSec));
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
}
