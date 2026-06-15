/**
 * Чистый (без node:crypto) модуль констант и парсинга гейта сайта — безопасен
 * для импорта в браузерный бандл web (в отличие от `utils/site-unlock`, который
 * тянет crypto). Источник имён куки/заголовка для API и web.
 */

/** Префикс имени куки анлока: `zhk_site_unlock_<siteId>`. */
export const SITE_UNLOCK_COOKIE_PREFIX = "zhk_site_unlock_";

/**
 * Заголовок, которым клиент передаёт токен анлока на кросс-доменных запросах к
 * API. Нужен потому, что кука анлока ставится на web-origin и не пересекает
 * границу origin: на клиентском fetch в API (другой домен) она не отправляется,
 * а на SSR — форвардится через `cookie`. Токен дублируется заголовком.
 */
export const SITE_UNLOCK_HEADER = "x-site-unlock";

/**
 * Достаёт токен анлока из cookie-заголовка — значение первой куки с префиксом
 * {@link SITE_UNLOCK_COOKIE_PREFIX}. На один web-origin приходится один сайт →
 * одна такая кука. `null`, если её нет.
 */
export function extractUnlockToken(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name.startsWith(SITE_UNLOCK_COOKIE_PREFIX)) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
