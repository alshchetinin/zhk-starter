import { publicProjectsRouter } from "./projects";
import { publicNewsRouter } from "./news";
import { publicPagesRouter } from "./pages";
import { publicDocumentsRouter } from "./documents";
import { publicPromotionsRouter } from "./promotions";
import { publicContactsRouter } from "./contacts";
import { publicHomepageRouter } from "./homepage";
import { publicConstructionProgressRouter } from "./construction-progress";
import { publicTicketsRouter } from "./tickets";

export const publicRouter = {
  projects: publicProjectsRouter,
  news: publicNewsRouter,
  pages: publicPagesRouter,
  documents: publicDocumentsRouter,
  promotions: publicPromotionsRouter,
  contacts: publicContactsRouter,
  homepage: publicHomepageRouter,
  constructionProgress: publicConstructionProgressRouter,
  tickets: publicTicketsRouter,
};
