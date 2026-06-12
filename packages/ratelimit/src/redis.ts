import { Redis } from "ioredis";

let client: Redis | null = null;

/**
 * Singleton ioredis. Подключаемся сразу при создании клиента (без lazyConnect),
 * чтобы первый consume к closed-scope не реджектился "Stream isn't writeable"
 * до установки соединения (ложный 429 при здоровом Redis). Если Redis недоступен
 * на старте — error-event ниже логирует, клиент переподключается, процесс не падает.
 * REDIS_URL читается из process.env напрямую (без @zhk/env/server),
 * чтобы модуль можно было импортировать в тестах без полного набора env-vars.
 */
export function getRedis(): Redis {
  if (client) return client;
  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  client = new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on("error", (err: Error) => {
    console.error("[ratelimit] redis error:", err.message);
  });
  return client;
}
