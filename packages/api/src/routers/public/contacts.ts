import { z } from "zod";
import { db } from "@zhk/db";
import { contacts, sites } from "@zhk/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { publicSiteProcedure } from "../../index";

export const publicContactsRouter = {
  list: publicSiteProcedure.handler(async ({ context }) => {
    return db.query.contacts.findMany({
      where: eq(contacts.siteId, context.siteId),
      orderBy: [asc(contacts.sortOrder), asc(contacts.label)],
    });
  }),

  layout: publicSiteProcedure.handler(async ({ context }) => {
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, context.siteId),
      columns: { settings: true },
    });
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

    return { header: pick(headerIds), footer: pick(footerIds) };
  }),

  getByIds: publicSiteProcedure
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
