import { db } from "@zhk/db";
import { projects } from "@zhk/db/schema";
import { inArray, ne, and } from "drizzle-orm";
import { blockDefinitions, type ContentBlock } from "../../shared/blocks";

const PROJECT_BLOCK_TYPES = new Set(
  blockDefinitions.filter((d) => d.category === "project").map((d) => d.type),
);

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
  contentBlocks: ContentBlock[],
): Promise<ContentBlock[]> {
  const projectIds = new Set<string>();
  for (const block of contentBlocks) {
    if (PROJECT_BLOCK_TYPES.has(block.type) && block.data?.projectId) {
      projectIds.add(block.data.projectId as string);
    }
  }

  if (projectIds.size === 0) return contentBlocks;

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

  return contentBlocks.map((block) => {
    if (!PROJECT_BLOCK_TYPES.has(block.type) || !block.data?.projectId) {
      return block;
    }
    const project = projectsMap.get(block.data.projectId as string);
    const projectData = project
      ? pickProjectFields(block.type, project as unknown as ProjectRow)
      : null;
    return { ...block, data: { ...block.data, project: projectData } };
  });
}
