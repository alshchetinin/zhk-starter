import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { integrationRouter } from "./integration";
import { projectsRouter } from "./projects";
import { buildingsRouter } from "./buildings";
import { sectionsRouter } from "./sections";
import { apartmentsRouter } from "./apartments";
import { commerceRouter } from "./commerce";
import { parkingRouter } from "./parking";
import { storageRouter } from "./storage";
import { apartmentLayoutsRouter } from "./apartment-layouts";
import { dashboardRouter } from "./dashboard";
import { uploadsRouter } from "./uploads";
import { citiesRouter } from "./cities";
import { newsRouter } from "./news";
import { pagesRouter } from "./pages";
import { documentsRouter } from "./documents";
import { promotionsRouter } from "./promotions";
import { banksRouter } from "./banks";
import { mortgageProgramsRouter } from "./mortgage-programs";
import { purchaseMethodsRouter } from "./purchase-methods";
import { contactsRouter } from "./contacts";
import { socialLinksRouter } from "./social-links";
import { homepageRouter } from "./homepage";
import { constructionProgressRouter } from "./construction-progress";
import { ticketsRouter } from "./tickets";
import { ticketSettingsRouter } from "./ticket-settings";
import { publicRouter } from "./public/index";
import { sitesRouter } from "./sites";
import { usersRouter } from "./users";
import { versionsRouter } from "./versions";
import { devRouter } from "./dev/index";
import { modalsRouter } from "./modals";
import { mediaRouter } from "./media";
import { tagsRouter } from "./tags";
import { pageCategoriesRouter } from "./page-categories";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  public: publicRouter,
  integration: integrationRouter,
  projects: projectsRouter,
  buildings: buildingsRouter,
  sections: sectionsRouter,
  apartments: apartmentsRouter,
  commerce: commerceRouter,
  parking: parkingRouter,
  storage: storageRouter,
  apartmentLayouts: apartmentLayoutsRouter,
  dashboard: dashboardRouter,
  uploads: uploadsRouter,
  cities: citiesRouter,
  news: newsRouter,
  pages: pagesRouter,
  pageCategories: pageCategoriesRouter,
  documents: documentsRouter,
  promotions: promotionsRouter,
  banks: banksRouter,
  mortgagePrograms: mortgageProgramsRouter,
  purchaseMethods: purchaseMethodsRouter,
  contacts: contactsRouter,
  socialLinks: socialLinksRouter,
  homepage: homepageRouter,
  constructionProgress: constructionProgressRouter,
  tickets: ticketsRouter,
  ticketSettings: ticketSettingsRouter,
  sites: sitesRouter,
  users: usersRouter,
  versions: versionsRouter,
  dev: devRouter,
  modals: modalsRouter,
  media: mediaRouter,
  tags: tagsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
