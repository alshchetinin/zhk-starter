import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { integrationRouter } from "./integration";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  integration: integrationRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
