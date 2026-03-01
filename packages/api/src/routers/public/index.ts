import { publicProjectsRouter } from "./projects";
import { publicNewsRouter } from "./news";
import { publicPagesRouter } from "./pages";
import { publicDocumentsRouter } from "./documents";
import { publicPromotionsRouter } from "./promotions";

export const publicRouter = {
  projects: publicProjectsRouter,
  news: publicNewsRouter,
  pages: publicPagesRouter,
  documents: publicDocumentsRouter,
  promotions: publicPromotionsRouter,
};
