import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
  type RateLimiterAbstract,
} from "rate-limiter-flexible";
import { getRedis } from "./redis";
import { resolveRateLimitConfig, type RateLimitScope } from "./config";

export interface RateDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
  resetAtMs: number;
}

/**
 * Лимитер для scope. failMode зашит в конструкцию:
 * - open: insuranceLimiter = RateLimiterMemory (fail-open при сбое Redis);
 * - closed: без insurance (consume вернёт allowed:false при сбое Redis).
 */
export function createLimiter(
  scope: RateLimitScope,
  envBag: Record<string, unknown>,
): RateLimiterAbstract {
  const cfg = resolveRateLimitConfig(scope, envBag);
  const base = {
    keyPrefix: `rl:${scope}`,
    points: cfg.points,
    duration: cfg.duration,
    ...(cfg.blockDuration ? { blockDuration: cfg.blockDuration } : {}),
  };
  const insuranceLimiter =
    cfg.failMode === "open"
      ? new RateLimiterMemory({ points: cfg.points, duration: cfg.duration })
      : undefined;
  return new RateLimiterRedis({
    storeClient: getRedis(),
    ...base,
    ...(insuranceLimiter ? { insuranceLimiter } : {}),
  });
}

/**
 * Списать 1 поинт по ключу. Различает превышение лимита (RateLimiterRes)
 * и сбой стораджа (Error): на сбой решение зависит от failMode.
 *
 * RateLimiterRes.consumedPoints при отказе = points + 1 (попытка сверх лимита),
 * поэтому limit = consumedPoints - 1 + remainingPoints.
 */
export async function consume(
  limiter: RateLimiterAbstract,
  key: string,
  failMode: "open" | "closed",
): Promise<RateDecision> {
  try {
    const res = await limiter.consume(key, 1);
    return {
      allowed: true,
      remaining: res.remainingPoints,
      retryAfterSec: 0,
      limit: res.remainingPoints + res.consumedPoints,
      resetAtMs: Date.now() + res.msBeforeNext,
    };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      // Превышение лимита — consumedPoints включает провальную попытку (+1),
      // поэтому вычитаем 1 чтобы получить реальный лимит.
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(err.msBeforeNext / 1000),
        limit: err.consumedPoints - 1 + err.remainingPoints,
        resetAtMs: Date.now() + err.msBeforeNext,
      };
    }
    // Любой не-RateLimiterRes throw (включая неизвестные типы) трактуем как
    // сбой хранилища (Redis down и нет insurance) → решает failMode. Для open-scope
    // эта ветка — safety net: insurance (RateLimiterMemory) обычно перехватывает
    // сбой раньше и сюда не доходит, но оставляем как защиту — не мёртвый код.
    //
    // ВНЕ продакшена closed-scope тоже fail-open: локально без Redis формы и
    // вход не должны ломаться в 429 (DX). В проде (NODE_ENV=production) closed
    // остаётся fail-closed — брутфорс важнее доступности. RL_ENABLED=false —
    // полный выключатель независимо от этого.
    const allowOnStorageError =
      failMode === "open" || process.env["NODE_ENV"] !== "production";
    return {
      allowed: allowOnStorageError,
      remaining: allowOnStorageError ? 1 : 0,
      retryAfterSec: allowOnStorageError ? 0 : 60,
      limit: 0,
      resetAtMs: allowOnStorageError ? Date.now() : Date.now() + 60_000,
    };
  }
}
