import { z } from "zod";

/** Одно звено цепочки. href нет → звено-текст без ссылки. */
export const breadcrumbItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1).optional(),
});
export type BreadcrumbItem = z.infer<typeof breadcrumbItemSchema>;

export const breadcrumbsModeSchema = z.enum(["auto", "custom", "hidden"]);
export type BreadcrumbsMode = z.infer<typeof breadcrumbsModeSchema>;

/** Per-page конфиг крошек (хранится в jsonb-колонке). */
export const breadcrumbsConfigSchema = z.object({
  mode: breadcrumbsModeSchema.default("auto"),
  items: z.array(breadcrumbItemSchema).default([]),
});
export type BreadcrumbsConfig = z.infer<typeof breadcrumbsConfigSchema>;

export const defaultBreadcrumbsConfig: BreadcrumbsConfig = {
  mode: "auto",
  items: [],
};

/** Site-level настройки крошек (живут в sites.settings.breadcrumbs). */
export const siteBreadcrumbsSettingsSchema = z.object({
  /** undefined → включено */
  enabled: z.boolean().optional(),
  /** undefined → «Главная» */
  homeLabel: z.string().optional(),
  /** undefined → false (на главной крошки скрыты) */
  showOnHome: z.boolean().optional(),
});
export type SiteBreadcrumbsSettings = z.infer<typeof siteBreadcrumbsSettingsSchema>;
