export type NewsStatus = "draft" | "published" | "archived";

export const statusOptions = [
  { label: "Черновик", value: "draft" as const },
  { label: "Опубликовано", value: "published" as const },
  { label: "Архив", value: "archived" as const },
];

export const statusColors: Record<NewsStatus, "success" | "warning" | "neutral"> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
};

export const statusLabels: Record<NewsStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  archived: "Архив",
};

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("ru-RU");
}
