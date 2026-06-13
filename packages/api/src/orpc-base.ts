import { os } from "@orpc/server";
import { evlog, type EvlogOrpcContext } from "evlog/orpc";
import { identifyUser } from "evlog/better-auth";
import type { Context } from "./context";

// Базовый builder. Контекст расширен EvlogOrpcContext (даёт типизированный
// context.log), но сам evlog()/identify навешиваем на publicProcedure, а не на
// builder — иначе o становится BuilderWithMiddlewares и теряет .middleware(),
// которым пользуются requireAuth/requireSite/rateLimit и др. middleware.
export const o = os.$context<Context & EvlogOrpcContext>();

// Идентификация юзера на wide event из уже резолвнутой сессии.
const identify = o.middleware(async ({ context, next }) => {
  if (context.session) identifyUser(context.log, context.session);
  return next();
});

// publicProcedure: evlog() даёт context.log в процедурах, тегирует wide event
// именем операции и мостит structured errors в ORPCError; identify добавляет
// идентификацию юзера на wide event.
export const publicProcedure = o.use(evlog()).use(identify);
