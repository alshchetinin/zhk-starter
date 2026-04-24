export type ModalStatus = "draft" | "published";

export const modalStatusOptions = [
  { label: "Черновик", value: "draft" as const },
  { label: "Опубликовано", value: "published" as const },
];

export const modalStatusColors: Record<ModalStatus, "success" | "neutral"> = {
  draft: "neutral",
  published: "success",
};

export const modalStatusLabels: Record<ModalStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
};
