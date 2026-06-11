import { z } from "zod";
import { defineBlock } from "./_core";

export const projectGalleryBlock = defineBlock({
  type: "project-gallery",
  label: "Галерея проекта",
  icon: "i-solar-gallery-linear",
  description: "Галерея изображений из проекта",
  category: "project",
  fields: [
    { name: "projectId", type: "string", label: "Проект", required: true },
    { name: "columns", type: "select", label: "Колонки", required: true, options: ["2", "3", "4"] },
    { name: "maxImages", type: "number", label: "Макс. изображений", required: false },
  ],
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
