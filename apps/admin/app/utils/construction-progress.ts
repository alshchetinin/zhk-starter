export type ConstructionProgressStatus = "draft" | "published";

export const constructionProgressStatusOptions = [
  { label: "Черновик", value: "draft" },
  { label: "Опубликовано", value: "published" },
];

export const constructionProgressStatusColors: Record<
  ConstructionProgressStatus,
  string
> = {
  draft: "neutral",
  published: "success",
};

export const constructionProgressStatusLabels: Record<
  ConstructionProgressStatus,
  string
> = {
  draft: "Черновик",
  published: "Опубликовано",
};

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function formatProgressDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
