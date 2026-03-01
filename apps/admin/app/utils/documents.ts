export type DocumentStatus = "draft" | "published";

export const documentStatusOptions = [
  { label: "Черновик", value: "draft" as const },
  { label: "Опубликовано", value: "published" as const },
];

export const documentStatusColors: Record<DocumentStatus, "success" | "neutral"> = {
  draft: "neutral",
  published: "success",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
};
