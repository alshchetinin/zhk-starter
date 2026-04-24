import { buildImportData } from "./adapter";
import {
  getHouses,
  getProjects,
  getProperties,
  verifyConnection,
  type ProfitbaseConfig,
} from "./client";

export { verifyConnection };
export type { ProfitbaseConfig, ProfitbaseProject } from "./client";

export interface ProfitbaseIntegrationConfig extends ProfitbaseConfig {
  id: string;
  siteId: string;
}

export async function getProfitbaseProjects(config: ProfitbaseConfig) {
  return getProjects(config);
}

export async function getProfitbaseData(
  config: ProfitbaseIntegrationConfig,
  projectIds: number[] = [],
) {
  const [projects, houses, properties] = await Promise.all([
    getProjects(config),
    getHouses(config),
    getProperties(config, projectIds),
  ]);

  return buildImportData({
    projects: projectIds.length
      ? projects.filter((p) => projectIds.includes(p.id))
      : projects,
    houses: projectIds.length
      ? houses.filter((h) => h.projectId && projectIds.includes(h.projectId))
      : houses,
    properties,
    integrationId: config.id,
    siteId: config.siteId,
  });
}
