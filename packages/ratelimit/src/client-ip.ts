// Минимальная валидация IP: IPv4 (a.b.c.d) или содержит ':' (IPv6).
function isIpLike(value: string): boolean {
  if (!value) return false;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return true;
  if (value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value)) return true;
  return false;
}

// Нормализация: разворачиваем IPv4-mapped IPv6 и стрипаем порт, чтобы один и
// тот же клиент не получал разные ключи лимита (вектор обхода).
function normalizeIp(value: string): string {
  let ip = value.trim();
  // IPv4-mapped IPv6: ::ffff:1.2.3.4(:port)? → 1.2.3.4 (порт стрипается ниже)
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?)$/i.exec(ip);
  if (mapped) ip = mapped[1]!;
  // Стрип порта у IPv4: 1.2.3.4:5678 → 1.2.3.4 (только если ровно один ':')
  if ((ip.match(/:/g) ?? []).length === 1 && /^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.split(":")[0]!;
  }
  return ip;
}

/**
 * Реальный IP клиента за Traefik. x-forwarded-for содержит цепочку
 * "client, proxy1, ..." — клиент идёт первым. Источник истины для ключей
 * rate-limit; в dev без прокси вернёт "unknown" — допустимо.
 *
 * БЕЗОПАСНОСТЬ: ключ лимита надёжен только если reverse-proxy (Traefik)
 * ПЕРЕЗАПИСЫВАЕТ x-forwarded-for, а не дописывает клиентское значение в начало —
 * иначе клиент спуфит первый IP и обходит лимит. Конфиг Traefik — см. Task 12
 * (docs/rate-limiting.md).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim() ?? "";
    const normFirst = normalizeIp(first);
    if (isIpLike(normFirst)) return normFirst;
  }
  const real = normalizeIp(headers.get("x-real-ip")?.trim() ?? "");
  if (isIpLike(real)) return real;
  return "unknown";
}
