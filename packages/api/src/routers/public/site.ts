import { z } from "zod";
import { db } from "@zhk/db";
import { sites } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicSiteProcedure } from "../../index";
import {
  buildUnlockSetCookie,
  computeUnlockToken,
  isSiteUnlockValid,
} from "../../utils/site-unlock";

export const publicSiteRouter = {
  status: publicSiteProcedure.handler(async ({ context }) => {
    const site = await db.query.sites.findFirst({
      where: eq(sites.id, context.siteId),
      columns: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
        accessPassword: true,
      },
    });
    if (!site) throw new ORPCError("NOT_FOUND");

    const requiresPassword = !!site.accessPassword;
    let status: "active" | "inactive" | "locked";
    if (!site.isActive) {
      status = "inactive";
    } else if (
      requiresPassword &&
      !isSiteUnlockValid(context.cookieHeader, site.id, site.accessPassword)
    ) {
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
    };
  }),

  unlock: publicSiteProcedure
    .input(z.object({ password: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const site = await db.query.sites.findFirst({
        where: eq(sites.id, context.siteId),
        columns: { id: true, accessPassword: true, isActive: true },
      });
      if (!site) throw new ORPCError("NOT_FOUND");
      if (!site.isActive) {
        throw new ORPCError("FORBIDDEN", { message: "SITE_INACTIVE" });
      }
      if (!site.accessPassword) {
        return { ok: true };
      }
      if (input.password !== site.accessPassword) {
        throw new ORPCError("UNAUTHORIZED", { message: "WRONG_PASSWORD" });
      }
      const token = computeUnlockToken(site.id, site.accessPassword);
      context.responseHeaders.append(
        "Set-Cookie",
        buildUnlockSetCookie(site.id, token),
      );
      return { ok: true };
    }),
};
