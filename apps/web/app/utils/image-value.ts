export type ImageValue = string | { url: string; alt?: string | null };

export function imageUrl(value: ImageValue | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.url;
}

/** per-usage alt объекта → central (по url) → fallback рендерера → "" */
export function resolveImageAlt(
  value: ImageValue | null | undefined,
  centralAlt: string | null | undefined,
  fallback: string,
): string {
  const perUsage = value && typeof value === "object" ? value.alt : null;
  return (perUsage || centralAlt || fallback || "").trim();
}
