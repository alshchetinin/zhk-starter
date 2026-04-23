import { z } from "zod";
import { defineBlock } from "./_core";

export const projectInfrastructureBlock = defineBlock({
  type: "project-infrastructure",
  label: "Инфраструктура на карте",
  icon: "i-tabler-map-2",
  description: "Карта инфраструктуры проекта с пинами по категориям",
  category: "project",
  dataSchema: z.object({
    projectId: z.string().min(1),
    mapHeight: z.number().default(500),
    showCategories: z.boolean().default(true),
  }),
  defaultData: {
    projectId: "",
    mapHeight: 500,
    showCategories: true,
  },
});
