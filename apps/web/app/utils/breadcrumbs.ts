import type {
  BreadcrumbItem,
  BreadcrumbsConfig,
  SiteBreadcrumbsSettings,
} from "@zhk/api/shared/breadcrumbs";

export interface AutoContext {
  /** Текущая страница — последнее звено, без ссылки. */
  current: string;
  /** Промежуточное звено (раздел/категория); href опционален. */
  parent?: BreadcrumbItem;
}

export interface ResolveInput {
  /** Override записи; undefined → авто. */
  config?: BreadcrumbsConfig | null;
  auto: AutoContext;
  settings?: SiteBreadcrumbsSettings | null;
  isHome?: boolean;
}

/**
 * Сводит per-page конфиг + авто-контекст + site-настройки в финальную цепочку.
 * Возвращает null, если крошки не должны рендериться.
 */
export function resolveBreadcrumbs(input: ResolveInput): BreadcrumbItem[] | null {
  const { config, auto, settings, isHome } = input;

  if (settings?.enabled === false) return null;
  if (isHome && !settings?.showOnHome) return null;
  if (config?.mode === "hidden") return null;

  const home: BreadcrumbItem = {
    label: settings?.homeLabel?.trim() || "Главная",
    href: "/",
  };

  if (config?.mode === "custom" && config.items.length > 0) {
    return [home, ...config.items];
  }

  // auto (включая custom с пустым items)
  const trail: BreadcrumbItem[] = [home];
  if (auto.parent) trail.push(auto.parent);
  trail.push({ label: auto.current });
  return trail;
}
