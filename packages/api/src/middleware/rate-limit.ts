import { ORPCError } from "@orpc/server";
import { env } from "@zhk/env/server";
import {
  consume,
  createLimiter,
  type RateLimitScope,
} from "@zhk/ratelimit";
import { o } from "../index";

type KeyBy = "ip" | "ip+site" | "ip+extra";

interface KeyableContext {
  clientIp: string;
  siteId: string | null;
}

/** Только цифры — для дедупликации телефона/похожих значений в ключе. */
function normalizeExtra(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits || "none";
}

export function buildRateLimitKey(
  keyBy: KeyBy,
  ctx: KeyableContext,
  extra: string | undefined,
): string {
  if (keyBy === "ip") return ctx.clientIp;
  if (keyBy === "ip+site") return `${ctx.clientIp}|${ctx.siteId ?? "none"}`;
  return `${ctx.clientIp}|${extra ? normalizeExtra(extra) : "none"}`;
}

// Лимитеры создаются лениво и кешируются по scope (один на процесс).
const limiterCache = new Map<RateLimitScope, ReturnType<typeof createLimiter>>();
function limiterFor(scope: RateLimitScope) {
  let l = limiterCache.get(scope);
  if (!l) {
    l = createLimiter(scope, env as unknown as Record<string, unknown>);
    limiterCache.set(scope, l);
  }
  return l;
}

interface RateLimitOpts {
  keyBy?: KeyBy;
  /** Для keyBy "ip+extra": достаёт значение из input. */
  extractExtra?: (input: unknown) => string | undefined;
  failMode?: "open" | "closed";
}

/**
 * oRPC middleware: списывает поинт scope по ключу из контекста/инпута.
 * При превышении бросает TOO_MANY_REQUESTS и кладёт Retry-After/RateLimit-*
 * в responseHeaders. RL_ENABLED=false полностью отключает (для тестов/локали).
 */
export function rateLimit(scope: RateLimitScope, opts: RateLimitOpts = {}) {
  const keyBy = opts.keyBy ?? "ip";
  const failMode = opts.failMode ?? "open";

  return o.middleware(async ({ context, next }, input) => {
    if (!env.RL_ENABLED) return next({ context });

    const ctx = context as unknown as KeyableContext & {
      responseHeaders: Headers;
    };
    const extra = opts.extractExtra ? opts.extractExtra(input) : undefined;
    const key = buildRateLimitKey(keyBy, ctx, extra);
    const decision = await consume(limiterFor(scope), key, failMode);

    ctx.responseHeaders.set("RateLimit-Limit", String(decision.limit));
    ctx.responseHeaders.set("RateLimit-Remaining", String(decision.remaining));
    ctx.responseHeaders.set("RateLimit-Reset", String(Math.ceil(decision.resetAtMs / 1000)));

    if (!decision.allowed) {
      ctx.responseHeaders.set("Retry-After", String(decision.retryAfterSec));
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Слишком много запросов. Повторите позже.",
        data: { retryAfterSec: decision.retryAfterSec },
      });
    }

    return next({ context });
  });
}
