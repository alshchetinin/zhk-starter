import type { BreadcrumbsConfig } from "@zhk/api/shared/breadcrumbs";

/** Перед сабмитом: для не-custom режимов чистим items; для custom — тримим, дропаем пустые href и пустые звенья. */
export function cleanBreadcrumbs(bc: BreadcrumbsConfig): BreadcrumbsConfig {
  if (bc.mode !== "custom") return { mode: bc.mode, items: [] };
  return {
    mode: "custom",
    items: bc.items
      .map((it) => ({ label: it.label.trim(), href: it.href?.trim() || undefined }))
      .filter((it) => it.label.length > 0),
  };
}

/** Дефолт для инициализации формы. */
export function emptyBreadcrumbs(): BreadcrumbsConfig {
  return { mode: "auto", items: [] };
}
