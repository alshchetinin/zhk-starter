import { db } from "@zhk/db";
import { projects } from "@zhk/db/schema";
import type { ContentBlock } from "@zhk/db/schema";
import { inArray, ne, and } from "drizzle-orm";
import { blockDefinitions } from "../../shared/blocks";

const PROJECT_BLOCK_TYPES: readonly string[] = blockDefinitions
  .filter((d) => d.category === "project")
  .map((d) => d.type);

function hasProjectId(
  block: ContentBlock,
): block is ContentBlock & { data: { projectId: string } } {
  return (
    PROJECT_BLOCK_TYPES.includes(block.type) &&
    typeof block.data.projectId === "string"
  );
}

type ProjectRow = typeof projects.$inferSelect;

/** Какие поля проекта нужны каждому типу блока */
function pickProjectFields(type: string, project: ProjectRow) {
  switch (type) {
    case "project-stats":
      return {
        name: project.name,
        freeApartmentsCount: project.freeApartmentsCount,
        paidReservationCount: project.paidReservationCount,
        corporateReservationCount: project.corporateReservationCount,
        soldApartmentsCount: project.soldApartmentsCount,
        totalApartmentsCount: project.totalApartmentsCount,
      };
    case "project-gallery":
      return {
        name: project.name,
        gallery: project.gallery,
        imageUrl: project.imageUrl,
      };
    case "project-location":
      return {
        name: project.name,
        address: project.address,
        coordinates: project.coordinates,
      };
    case "project-infrastructure":
      return {
        name: project.name,
        coordinates: project.coordinates,
        infrastructureCategories: project.infrastructureCategories,
        infrastructurePins: project.infrastructurePins,
      };
    default:
      return { name: project.name };
  }
}

/**
 * Обогащает content blocks данными проектов.
 * Каждый блок получает только нужные ему поля проекта в `data.project`.
 */
export async function enrichContentBlocks(
  contentBlocks: ContentBlock[] | null | undefined,
): Promise<ContentBlock[]> {
  const blocks = contentBlocks ?? [];
  const projectIds = new Set<string>();
  for (const block of blocks) {
    if (hasProjectId(block)) projectIds.add(block.data.projectId);
  }

  if (projectIds.size === 0) return blocks;

  const data = await db.query.projects.findMany({
    where: and(
      inArray(projects.id, [...projectIds]),
      ne(projects.status, "hidden"),
    ),
    columns: {
      id: true,
      name: true,
      address: true,
      coordinates: true,
      gallery: true,
      imageUrl: true,
      freeApartmentsCount: true,
      paidReservationCount: true,
      corporateReservationCount: true,
      soldApartmentsCount: true,
      totalApartmentsCount: true,
      infrastructureCategories: true,
      infrastructurePins: true,
    },
  });

  const projectsMap = new Map(data.map((p) => [p.id, p]));

  return blocks.map((block) => {
    if (!hasProjectId(block)) return block;
    const project = projectsMap.get(block.data.projectId);
    const projectData = project
      ? pickProjectFields(block.type, project as unknown as ProjectRow)
      : null;
    return { ...block, data: { ...block.data, project: projectData } };
  });
}
