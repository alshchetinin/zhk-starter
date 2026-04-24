import { publicProjectsRouter } from "./projects";
import { publicNewsRouter } from "./news";
import { publicPagesRouter } from "./pages";
import { publicDocumentsRouter } from "./documents";
import { publicPromotionsRouter } from "./promotions";
import { publicMortgageProgramsRouter } from "./mortgage-programs";
import { publicPurchaseMethodsRouter } from "./purchase-methods";
import { publicContactsRouter } from "./contacts";
import { publicHomepageRouter } from "./homepage";
import { publicConstructionProgressRouter } from "./construction-progress";
import { publicTicketsRouter } from "./tickets";
import { publicModalsRouter } from "./modals";

export const publicRouter = {
  projects: publicProjectsRouter,
  news: publicNewsRouter,
  pages: publicPagesRouter,
  documents: publicDocumentsRouter,
  promotions: publicPromotionsRouter,
  mortgagePrograms: publicMortgageProgramsRouter,
  purchaseMethods: publicPurchaseMethodsRouter,
  contacts: publicContactsRouter,
  homepage: publicHomepageRouter,
  constructionProgress: publicConstructionProgressRouter,
  tickets: publicTicketsRouter,
  modals: publicModalsRouter,
};
