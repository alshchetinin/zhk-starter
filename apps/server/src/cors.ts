/**
 * Решает значение заголовка `Access-Control-Allow-Origin` для запроса.
 *
 * Контент-API (`/rpc/*`) — мультитенант: публичные сайты живут на произвольных
 * доменах и поддоменах (каждый сайт резолвится по Host), статически перечислить
 * их в allowlist нельзя — новые сайты (в т.ч. дубли под города) создаются на
 * лету. Поэтому для `/rpc/*` отражаем любой Origin: контент должен читаться с
 * любого домена сайта.
 *
 * Это НЕ ослабляет авторизацию. Защищённые процедуры всё равно требуют валидную
 * сессию (кука `httpOnly` + scoped по `COOKIE_DOMAIN`, кросс-доменный origin её
 * не получит). CORS управляет лишь тем, может ли браузер ПРОЧИТАТЬ ответ, а не
 * тем, выполнится ли авторизация.
 *
 * Аутентификация (`/api/auth/*`) и всё остальное — только из явного allowlist
 * `CORS_ORIGINS` (админка, основной сайт): там минтятся креды, расширять origin
 * незачем.
 *
 * @returns origin для отражения в ACAO, либо null (заголовок не ставится →
 *   браузер блокирует кросс-доменное чтение).
 */
export function resolveCorsOrigin(
  origin: string,
  path: string,
  allowlist: readonly string[],
): string | null {
  if (!origin) return null;
  if (path.startsWith("/rpc/")) return origin;
  return allowlist.includes(origin) ? origin : null;
}
