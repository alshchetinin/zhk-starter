import { z } from "zod";
import { db } from "@zhk/db";
import { contacts, sites, socialLinks } from "@zhk/db/schema";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";

async function resolveSiteSocials(siteId: string) {
  const rows = await db.query.socialLinks.findMany({
    where: or(eq(socialLinks.siteId, siteId), isNull(socialLinks.siteId)),
    orderBy: [asc(socialLinks.sortOrder), asc(socialLinks.createdAt)],
  });
  const perSite = rows.filter((r) => r.siteId === siteId);
  return perSite.length ? perSite : rows.filter((r) => r.siteId === null);
}

export const publicContactsRouter = {
  list: publicActiveSiteProcedure.handler(async ({ context }) => {
    return db.query.contacts.findMany({
      where: eq(contacts.siteId, context.siteId),
      orderBy: [asc(contacts.sortOrder), asc(contacts.label)],
    });
  }),

  layout: publicActiveSiteProcedure.handler(async ({ context }) => {
    const [site, siteSocials] = await Promise.all([
      db.query.sites.findFirst({
        where: eq(sites.id, context.siteId),
        columns: { settings: true },
      }),
      resolveSiteSocials(context.siteId),
    ]);
    const headerIds = site?.settings?.contactsHeaderIds ?? [];
    const footerIds = site?.settings?.contactsFooterIds ?? [];
    const allIds = Array.from(new Set([...headerIds, ...footerIds]));

    const items = allIds.length
      ? await db.query.contacts.findMany({
          where: and(
            eq(contacts.siteId, context.siteId),
            inArray(contacts.id, allIds),
          ),
        })
      : [];
    const byId = new Map(items.map((c) => [c.id, c]));

    const pick = (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c);

    return {
      header: pick(headerIds),
      footer: pick(footerIds),
      socials: siteSocials,
    };
  }),

  siteSocials: publicActiveSiteProcedure.handler(async ({ context }) => {
    return resolveSiteSocials(context.siteId);
  }),

  getByIds: publicActiveSiteProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      if (input.ids.length === 0) return [];
      return db.query.contacts.findMany({
        where: and(
          eq(contacts.siteId, context.siteId),
          inArray(contacts.id, input.ids),
        ),
      });
    }),
};
