// Минимальная валидация IP: IPv4 (a.b.c.d) или содержит ':' (IPv6).
function isIpLike(value: string): boolean {
  if (!value) return false;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return true;
  if (value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value)) return true;
  return false;
}

/**
 * Реальный IP клиента за Traefik. x-forwarded-for содержит цепочку
 * "client, proxy1, ..." — клиент идёт первым. Источник истины для ключей
 * rate-limit; в dev без прокси вернёт "unknown" — допустимо.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim() ?? "";
    if (isIpLike(first)) return first;
  }
  const real = headers.get("x-real-ip")?.trim() ?? "";
  if (isIpLike(real)) return real;
  return "unknown";
}
