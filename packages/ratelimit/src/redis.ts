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
  // ioredis эмитит error на каждую неудачную попытку переподключения — без
  // дедупликации это спамит консоль десятками строк в секунду, когда Redis
  // недоступен (типично для локального дева без Redis). Логируем переход
  // connected→errored один раз, и один раз восстановление.
  let loggedError = false;
  client.on("error", (err: Error) => {
    if (loggedError) return;
    loggedError = true;
    console.warn(
      `[ratelimit] redis недоступен (${err.message || "connection error"}) — ` +
        `лимиты деградируют (в dev открыты, в prod closed-scope → 429). ` +
        `Поднять локально: docker compose -f packages/db/docker-compose.yml up redis -d`,
    );
  });
  client.on("ready", () => {
    if (loggedError) {
      loggedError = false;
      console.info("[ratelimit] redis подключён");
    }
  });
  return client;
}
