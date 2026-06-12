import { ORPCError } from "@orpc/server";
import { env } from "@zhk/env/server";
import {
  consume,
  createLimiter,
  resolveRateLimitConfig,
  type RateLimitScope,
} from "@zhk/ratelimit";
import { o } from "../orpc-base";

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
}

/**
 * oRPC middleware: списывает поинт scope по ключу из контекста/инпута.
 * При превышении бросает TOO_MANY_REQUESTS и кладёт Retry-After/RateLimit-*
 * в responseHeaders. RL_ENABLED=false полностью отключает (для тестов/локали).
 */
export function rateLimit(scope: RateLimitScope, opts: RateLimitOpts = {}) {
  const keyBy = opts.keyBy ?? "ip";
  // failMode — единый источник правды: конфиг scope. createLimiter использует
  // его для наличия insurance-лимитера, consume — для решения при сбое стораджа.
  // Передавать failMode в opts нельзя: рассинхрон с лимитером ломает fail-closed.
  const { failMode } = resolveRateLimitConfig(
    scope,
    env as unknown as Record<string, unknown>,
  );

  // Context (os.$context<Context>()) уже несёт clientIp/siteId/responseHeaders —
  // oRPC прокидывает его через цепочку middleware без сужения, каст не нужен.
  return o.middleware(async ({ context, next }, input) => {
    if (!env.RL_ENABLED) return next();

    const extra = opts.extractExtra ? opts.extractExtra(input) : undefined;
    const key = buildRateLimitKey(keyBy, context, extra);
    const decision = await consume(limiterFor(scope), key, failMode);

    // limit=0 — сбой стораджа (нет реального лимита). Заголовки RateLimit-*
    // ставим только при валидном лимите, чтобы не вводить клиента в заблуждение.
    if (decision.limit > 0) {
      context.responseHeaders.set("RateLimit-Limit", String(decision.limit));
      context.responseHeaders.set("RateLimit-Remaining", String(decision.remaining));
      context.responseHeaders.set("RateLimit-Reset", String(Math.ceil(decision.resetAtMs / 1000)));
    }

    if (!decision.allowed) {
      context.responseHeaders.set("Retry-After", String(decision.retryAfterSec));
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Слишком много запросов. Повторите позже.",
        data: { retryAfterSec: decision.retryAfterSec },
      });
    }

    return next();
  });
}
