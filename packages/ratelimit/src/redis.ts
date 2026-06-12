import { Redis } from "ioredis";

let client: Redis | null = null;

/**
 * Singleton ioredis. lazyConnect — не падаем на старте, если Redis недоступен.
 * REDIS_URL читается из process.env напрямую (без @zhk/env/server),
 * чтобы модуль можно было импортировать в тестах без полного набора env-vars.
 */
export function getRedis(): Redis {
  if (client) return client;
  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on("error", (err: Error) => {
    console.error("[ratelimit] redis error:", err.message);
  });
  return client;
}
