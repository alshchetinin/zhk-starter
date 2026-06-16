import { z } from "zod";
import type {
  NavItem,
  NavRoute,
  FooterColumn,
  SiteNavigation,
} from "@zhk/db/schema";

// Ре-экспорт типов данных навигации — единая точка импорта для admin/web,
// чтобы не тянуть @zhk/db/schema напрямую во фронтовые бандлы.
export type { NavItem, NavRoute, NavTarget, FooterColumn, SiteNavigation } from "@zhk/db/schema";

// --- Системные роуты ---------------------------------------------------------

export const NAV_ROUTES = [
  "/",
  "/projects",
  "/news",
  "/documents",
  "/promotions",
] as const satisfies readonly NavRoute[];

/** Дефолтные подписи системных разделов (Record по union → растёт вместе с NavRoute). */
export const NAV_ROUTE_LABELS: Record<NavRoute, string> = {
  "/": "Главная",
  "/projects": "Проекты",
  "/news": "Новости",
  "/documents": "Документы",
  "/promotions": "Акции",
};

// --- Zod-схема ---------------------------------------------------------------

// Без аннотации z.ZodType<NavTarget> на самом union (discriminatedUnion плохо
// дружит с satisfies) — совместимость с NavTarget проверяется ниже, т.к.
// navItemSchema аннотирован z.ZodType<NavItem> и содержит это поле target.
const navTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page"), pageId: z.string() }),
  z.object({ kind: z.literal("route"), route: z.enum(NAV_ROUTES) }),
  z.object({ kind: z.literal("category"), categoryId: z.string() }),
  z.object({ kind: z.literal("url"), href: z.string(), external: z.boolean().optional() }),
  z.object({ kind: z.literal("action"), modal: z.string() }),
]);

const navItemSchema: z.ZodType<NavItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().optional(),
    target: navTargetSchema,
    children: z.array(navItemSchema).optional(),
  }),
);

const footerColumnSchema: z.ZodType<FooterColumn> = z.object({
  id: z.string(),
  title: z.string().optional(),
  items: z.array(navItemSchema),
});

export const siteNavigationSchema: z.ZodType<SiteNavigation> = z.object({
  header: z.array(navItemSchema),
  footer: z.array(footerColumnSchema),
});

// --- Дефолт ------------------------------------------------------------------

export const defaultSiteNavigation: SiteNavigation = {
  header: [
    { id: "projects", target: { kind: "route", route: "/projects" } },
    { id: "news", target: { kind: "route", route: "/news" } },
    { id: "documents", target: { kind: "route", route: "/documents" } },
    { id: "promotions", target: { kind: "route", route: "/promotions" } },
  ],
  footer: [
    {
      id: "nav",
      title: "Навигация",
      items: [
        { id: "f-projects", target: { kind: "route", route: "/projects" } },
        { id: "f-news", target: { kind: "route", route: "/news" } },
        { id: "f-documents", target: { kind: "route", route: "/documents" } },
        { id: "f-promotions", target: { kind: "route", route: "/promotions" } },
      ],
    },
  ],
};

// --- Ремап (для site-duplication) -------------------------------------------

export function remapNavigationReferences(
  nav: SiteNavigation | undefined,
  pageMap: Map<string, string>,
  categoryMap: Map<string, string>,
): SiteNavigation | undefined {
  if (!nav) return nav;
  const remapItem = (item: NavItem): NavItem => {
    let target = item.target;
    if (target.kind === "page") {
      target = { ...target, pageId: pageMap.get(target.pageId) ?? target.pageId };
    } else if (target.kind === "category") {
      target = { ...target, categoryId: categoryMap.get(target.categoryId) ?? target.categoryId };
    }
    return {
      ...item,
      target,
      children: item.children?.map(remapItem),
    };
  };
  return {
    header: nav.header.map(remapItem),
    footer: nav.footer.map((col) => ({ ...col, items: col.items.map(remapItem) })),
  };
}

// --- Сбор ссылок -------------------------------------------------------------

export function collectNavReferences(nav: SiteNavigation): {
  pageIds: string[];
  categoryIds: string[];
} {
  const pageIds = new Set<string>();
  const categoryIds = new Set<string>();
  const walk = (items: NavItem[]) => {
    for (const it of items) {
      if (it.target.kind === "page") pageIds.add(it.target.pageId);
      else if (it.target.kind === "category") categoryIds.add(it.target.categoryId);
      if (it.children) walk(it.children);
    }
  };
  walk(nav.header);
  for (const col of nav.footer) walk(col.items);
  return { pageIds: [...pageIds], categoryIds: [...categoryIds] };
}

// --- Резолв (чистый; данные приходят из БД в роутере) ------------------------

export interface ResolvedNavItem {
  id: string;
  label: string;
  href?: string;
  external?: boolean;
  /** slug модалки для target.kind === "action" */
  action?: string;
  children?: ResolvedNavItem[];
}

export interface ResolvedFooterColumn {
  id: string;
  title?: string;
  items: ResolvedNavItem[];
}

export interface ResolvedNavigation {
  header: ResolvedNavItem[];
  footer: ResolvedFooterColumn[];
}

export interface NavResolveContext {
  /** Только опубликованные страницы сайта: id → { slug, title } */
  pages: Map<string, { slug: string; title: string }>;
  /** Категории сайта: id → { title } */
  categories: Map<string, { title: string }>;
  /** Опубликованные страницы по категории (для авто-подменю) */
  pagesByCategory: Map<string, { slug: string; title: string }[]>;
}

function isPresent<T>(x: T | null): x is T {
  return x !== null;
}

export function resolveNavigation(
  nav: SiteNavigation,
  ctx: NavResolveContext,
): ResolvedNavigation {
  const resolveItem = (item: NavItem): ResolvedNavItem | null => {
    const t = item.target;
    const children = item.children?.map(resolveItem).filter(isPresent);
    switch (t.kind) {
      case "page": {
        const p = ctx.pages.get(t.pageId);
        if (!p) return null;
        return { id: item.id, label: item.label || p.title, href: `/pages/${p.slug}`, children };
      }
      case "route":
        return {
          id: item.id,
          label: item.label || NAV_ROUTE_LABELS[t.route],
          href: t.route,
          children,
        };
      case "category": {
        const c = ctx.categories.get(t.categoryId);
        if (!c) return null;
        const auto = (ctx.pagesByCategory.get(t.categoryId) ?? []).map((p) => ({
          id: `${item.id}:${p.slug}`,
          label: p.title,
          href: `/pages/${p.slug}`,
        }));
        return {
          id: item.id,
          label: item.label || c.title,
          children: [...(children ?? []), ...auto],
        };
      }
      case "url":
        return {
          id: item.id,
          label: item.label || t.href,
          href: t.href,
          external: t.external,
          children,
        };
      case "action":
        // Пустая подпись намеренна: нет осмысленного серверного фолбэка для slug модалки — подпись задаёт редактор.
        return { id: item.id, label: item.label || "", action: t.modal, children };
    }
  };

  const resolveItems = (items: NavItem[]) => items.map(resolveItem).filter(isPresent);

  return {
    header: resolveItems(nav.header),
    footer: nav.footer.map((col) => ({
      id: col.id,
      title: col.title,
      items: resolveItems(col.items),
    })),
  };
}
