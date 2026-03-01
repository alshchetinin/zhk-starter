export type PageStatus = "draft" | "published" | "archived";

export const pageStatusOptions = [
  { label: "Черновик", value: "draft" as const },
  { label: "Опубликовано", value: "published" as const },
  { label: "Архив", value: "archived" as const },
];

export const pageStatusColors: Record<PageStatus, "success" | "warning" | "neutral"> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

export const pageStatusLabels: Record<PageStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  archived: "Архив",
};
