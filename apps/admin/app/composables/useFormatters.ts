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
