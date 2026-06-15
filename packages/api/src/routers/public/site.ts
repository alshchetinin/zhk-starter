import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { db } from "@zhk/db";
import { contacts, news, pages, projects, sites } from "@zhk/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { publicSiteProcedure } from "../../index";
import { rateLimit } from "../../middleware/rate-limit";
import { isSiteIndexable, type PublicSiteSeo } from "../../shared/seo";
import { SITE_GATE_ERROR } from "../../utils/site-gate-errors";
import {
  buildUnlockSetCookie,
  computeUnlockToken,
  isSiteUnlockValid,
  isUnlockTokenValid,
} from "../../utils/site-unlock";

type SiteRow = typeof sites.$inferSelect;

/**
 * Собирает публичный SEO-payload: нормализует настройки и резолвит
 * телефон/адрес организации из контакта (выбранного или первого в футере).
 */
async function buildPublicSeo(site: SiteRow): Promise<PublicSiteSeo> {
  const seo = site.settings?.seo ?? {};
  const org = seo.organization ?? {};

  const contactId = org.contactId || site.settings?.contactsFooterIds?.[0] || null;
  const contact = contactId
    ? await db.query.contacts.findFirst({
        where: and(eq(contacts.id, contactId), eq(contacts.siteId, site.id)),
      })
    : null;

  return {
    titleSuffix: seo.titleSuffix?.trim() || null,
    defaultTitle: seo.defaultTitle?.trim() || null,
    defaultDescription: seo.defaultDescription?.trim() || null,
    defaultOgImage: seo.defaultOgImage || null,
    favicon: seo.favicon || null,
    indexable: isSiteIndexable({
      isActive: site.isActive,
      accessPassword: site.accessPassword ?? null,
      indexingEnabled: seo.indexingEnabled,
    }),
    yandexVerification: seo.yandexVerification?.trim() || null,
    googleVerification: seo.googleVerification?.trim() || null,
    organization: {
      name: org.name?.trim() || site.name,
      legalName: org.legalName?.trim() || null,
      logo: org.logo || null,
      phone: contact?.phone ?? null,
      email: contact?.email ?? null,
      address: contact?.address ?? null,
    },
  };
}

export const publicSiteRouter = {
  status: publicSiteProcedure.handler(async ({ context }) => {
    const site = context.site;
    if (!site) throw new ORPCError("NOT_FOUND");

    const requiresPassword = !!site.accessPassword;
    // Анлок из куки (SSR) ИЛИ из заголовка x-site-unlock (клиентский кросс-домен).
    const unlocked =
      isSiteUnlockValid(context.cookieHeader, site.id, site.accessPassword) ||
      isUnlockTokenValid(context.siteUnlockToken, site.id, site.accessPassword);
    let status: "active" | "inactive" | "locked";
    if (!site.isActive) {
      status = "inactive";
    } else if (requiresPassword && !unlocked) {
      status = "locked";
    } else {
      status = "active";
    }

    return {
      id: site.id,
      slug: site.slug,
      name: site.name,
      status,
      requiresPassword,
      analytics: site.settings?.analytics ?? null,
      seo: await buildPublicSeo(site),
    };
  }),

  /**
   * Данные для sitemap.xml и robots.txt. Намеренно НЕ active-gated:
   * закрытый сайт должен отвечать { indexable: false }, а не 403.
   * Фильтры сущностей зеркалят публичные list-процедуры.
   */
  sitemap: publicSiteProcedure
    .use(rateLimit("publicRead", { keyBy: "ip" }))
    .handler(async ({ context }) => {
      const site = context.site;
      if (!site) throw new ORPCError("NOT_FOUND");

      const indexable = isSiteIndexable({
        isActive: site.isActive,
        accessPassword: site.accessPassword ?? null,
        indexingEnabled: site.settings?.seo?.indexingEnabled,
      });
      if (!indexable) {
        return { indexable: false, news: [], pages: [], projects: [] };
      }

      const [newsRows, pageRows, projectRows] = await Promise.all([
        db.query.news.findMany({
          where: and(eq(news.siteId, site.id), eq(news.status, "published")),
          columns: { slug: true, updatedAt: true },
        }),
        db.query.pages.findMany({
          where: and(eq(pages.siteId, site.id), eq(pages.status, "published")),
          columns: { slug: true, updatedAt: true },
        }),
        db.query.projects.findMany({
          where: ne(projects.status, "hidden"),
          columns: { id: true, updatedAt: true },
        }),
      ]);

      return { indexable: true, news: newsRows, pages: pageRows, projects: projectRows };
    }),

  unlock: publicSiteProcedure
    .use(rateLimit("siteUnlock", { keyBy: "ip+site" }))
    .input(z.object({ password: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const site = context.site;
      if (!site) throw new ORPCError("NOT_FOUND");
      if (!site.isActive) {
        throw new ORPCError("FORBIDDEN", { message: SITE_GATE_ERROR.INACTIVE });
      }
      if (!site.accessPassword) {
        return { ok: true };
      }
      if (input.password !== site.accessPassword) {
        throw new ORPCError("UNAUTHORIZED", {
          message: SITE_GATE_ERROR.WRONG_PASSWORD,
        });
      }
      const token = computeUnlockToken(site.id, site.accessPassword);
      context.responseHeaders.append(
        "Set-Cookie",
        buildUnlockSetCookie(site.id, token),
      );
      return { ok: true };
    }),
};
