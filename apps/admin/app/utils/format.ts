export function formatDate(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("ru-RU");
}

export function formatMoney(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercent(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(2).replace(/\.00$/, "")}%`;
}
