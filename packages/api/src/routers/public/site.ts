import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { publicSiteProcedure } from "../../index";
import { rateLimit } from "../../middleware/rate-limit";
import { SITE_GATE_ERROR } from "../../utils/site-gate-errors";
import {
  buildUnlockSetCookie,
  computeUnlockToken,
  isSiteUnlockValid,
} from "../../utils/site-unlock";

export const publicSiteRouter = {
  status: publicSiteProcedure.handler(async ({ context }) => {
    const site = context.site;
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
      analytics: site.settings?.analytics ?? null,
    };
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
