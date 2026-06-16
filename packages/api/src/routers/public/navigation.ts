import { db } from "@zhk/db";
import { pages, pageCategories } from "@zhk/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";
import {
  collectNavReferences,
  defaultSiteNavigation,
  resolveNavigation,
  type NavResolveContext,
} from "../../shared/navigation";

export const publicNavigationRouter = {
  layout: publicActiveSiteProcedure.handler(async ({ context }) => {
    const nav = context.site.settings?.navigation ?? defaultSiteNavigation;
    const { pageIds, categoryIds } = collectNavReferences(nav);

    // Опубликованные страницы, на которые ссылаются пункты page-типа.
    const pageRows = pageIds.length
      ? await db.query.pages.findMany({
          where: and(
            eq(pages.siteId, context.siteId),
            inArray(pages.id, pageIds),
            eq(pages.status, "published"),
          ),
          columns: { id: true, slug: true, title: true },
        })
      : [];

    // Категории, на которые ссылаются пункты category-типа.
    const catRows = categoryIds.length
      ? await db.query.pageCategories.findMany({
          where: and(
            eq(pageCategories.siteId, context.siteId),
            inArray(pageCategories.id, categoryIds),
          ),
          columns: { id: true, title: true },
        })
      : [];

    // Опубликованные страницы этих категорий — для авто-подменю.
    // Порядок (asc title) важен: resolveNavigation сохраняет порядок pagesByCategory без пересортировки.
    const catPageRows = categoryIds.length
      ? await db.query.pages.findMany({
          where: and(
            eq(pages.siteId, context.siteId),
            inArray(pages.categoryId, categoryIds),
            eq(pages.status, "published"),
          ),
          columns: { slug: true, title: true, categoryId: true },
          orderBy: [asc(pages.title)],
        })
      : [];

    const pagesByCategory = new Map<string, { slug: string; title: string }[]>();
    for (const p of catPageRows) {
      if (!p.categoryId) continue;
      const arr = pagesByCategory.get(p.categoryId) ?? [];
      arr.push({ slug: p.slug, title: p.title });
      pagesByCategory.set(p.categoryId, arr);
    }

    const ctx: NavResolveContext = {
      pages: new Map(pageRows.map((p) => [p.id, { slug: p.slug, title: p.title }])),
      categories: new Map(catRows.map((c) => [c.id, { title: c.title }])),
      pagesByCategory,
    };

    return resolveNavigation(nav, ctx);
  }),
};
