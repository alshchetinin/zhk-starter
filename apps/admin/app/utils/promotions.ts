export type PromotionStatus = "draft" | "published" | "archived";

export const promotionStatusOptions = [
  { label: "Черновик", value: "draft" as const },
  { label: "Опубликовано", value: "published" as const },
  { label: "Архив", value: "archived" as const },
];

export const promotionStatusColors: Record<
  PromotionStatus,
  "success" | "warning" | "neutral"
> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

export const promotionStatusLabels: Record<PromotionStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  archived: "Архив",
};
