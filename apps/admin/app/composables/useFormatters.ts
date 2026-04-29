export function fmtDate(d: string | Date | null | undefined): string {
  return d ? new Date(d).toLocaleString("ru-RU") : "—";
}

export function fmtDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} мс`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s} с`;
  return `${Math.floor(s / 60)} мин ${Math.round(s % 60)} с`;
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function fmtRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч назад`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd} дн назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
