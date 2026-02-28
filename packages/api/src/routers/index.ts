import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { integrationRouter } from "./integration";
import { projectsRouter } from "./projects";
import { buildingsRouter } from "./buildings";
import { apartmentsRouter } from "./apartments";
import { commerceRouter } from "./commerce";
import { apartmentLayoutsRouter } from "./apartment-layouts";
import { dashboardRouter } from "./dashboard";
import { uploadsRouter } from "./uploads";
import { citiesRouter } from "./cities";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  integration: integrationRouter,
  projects: projectsRouter,
  buildings: buildingsRouter,
  apartments: apartmentsRouter,
  commerce: commerceRouter,
  apartmentLayouts: apartmentLayoutsRouter,
  dashboard: dashboardRouter,
  uploads: uploadsRouter,
  cities: citiesRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
