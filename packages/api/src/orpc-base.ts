import { os } from "@orpc/server";
import { captureUnexpected } from "@zhk/observability";
import type { Context } from "./context";

// Базовый builder. Оставляем `o` чистым Builder'ом (без .use на нём), иначе он
// становится BuilderWithMiddlewares и теряет .middleware(), которым пользуются
// requireAuth/requireSite/rateLimit и др. middleware в index.ts/rate-limit.ts.
export const o = os.$context<Context>();

// Ловит ошибки процедур → шлёт НЕОЖИДАННЫЕ (5xx / не-ORPCError) в Sentry Issues
// с тегами operation/siteId, потом пробрасывает дальше (ответ клиенту не меняется).
const sentryCapture = o.middleware(async ({ context, next, path }) => {
  try {
    return await next();
  } catch (err) {
    captureUnexpected(err, {
      operation: Array.isArray(path) ? path.join(".") : String(path),
      siteId: context.siteId ?? undefined,
      userId: context.session?.user?.id,
    });
    throw err;
  }
});

// publicProcedure несёт sentryCapture; остальные процедуры строятся от него.
export const publicProcedure = o.use(sentryCapture);
