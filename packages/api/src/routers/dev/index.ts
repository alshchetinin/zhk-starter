import { devBlocksRouter } from "./blocks";
import { devCollectionsRouter } from "./collections";
import { devIntegrationProviderRouter } from "./integration-provider";

export const devRouter = {
  blocks: devBlocksRouter,
  collections: devCollectionsRouter,
  integrationProvider: devIntegrationProviderRouter,
};
