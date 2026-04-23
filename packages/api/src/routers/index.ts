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
import { newsRouter } from "./news";
import { pagesRouter } from "./pages";
import { documentsRouter } from "./documents";
import { promotionsRouter } from "./promotions";
import { contactsRouter } from "./contacts";
import { homepageRouter } from "./homepage";
import { constructionProgressRouter } from "./construction-progress";
import { ticketsRouter } from "./tickets";
import { ticketSettingsRouter } from "./ticket-settings";
import { publicRouter } from "./public/index";
import { sitesRouter } from "./sites";
import { usersRouter } from "./users";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  public: publicRouter,
  integration: integrationRouter,
  projects: projectsRouter,
  buildings: buildingsRouter,
  apartments: apartmentsRouter,
  commerce: commerceRouter,
  apartmentLayouts: apartmentLayoutsRouter,
  dashboard: dashboardRouter,
  uploads: uploadsRouter,
  cities: citiesRouter,
  news: newsRouter,
  pages: pagesRouter,
  documents: documentsRouter,
  promotions: promotionsRouter,
  contacts: contactsRouter,
  homepage: homepageRouter,
  constructionProgress: constructionProgressRouter,
  tickets: ticketsRouter,
  ticketSettings: ticketSettingsRouter,
  sites: sitesRouter,
  users: usersRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
