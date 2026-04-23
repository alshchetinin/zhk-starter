import { z } from "zod";
import { defineBlock } from "./_core";

export const projectGalleryBlock = defineBlock({
  type: "project-gallery",
  label: "Галерея проекта",
  icon: "i-tabler-photo",
  description: "Галерея изображений из проекта",
  category: "project",
  dataSchema: z.object({
    projectId: z.string().min(1),
    columns: z.enum(["2", "3", "4"]).default("3"),
    maxImages: z.number().optional(),
  }),
  defaultData: {
    projectId: "",
    columns: "3" as const,
    maxImages: undefined,
  },
});
