export type MortgageProgramStatus = "active" | "archived";

export const mortgageProgramStatusOptions = [
  { label: "Активна", value: "active" as const },
  { label: "Архив", value: "archived" as const },
];

export const mortgageProgramStatusColors: Record<
  MortgageProgramStatus,
  "success" | "warning" | "neutral"
> = {
  active: "success",
  archived: "warning",
};

export const mortgageProgramStatusLabels: Record<
  MortgageProgramStatus,
  string
> = {
  active: "Активна",
  archived: "Архив",
};

export function formatTermMonths(months: number | null | undefined) {
  if (!months) return "—";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years} г. ${rest} мес.`;
  if (years) return `${years} г.`;
  return `${months} мес.`;
}
