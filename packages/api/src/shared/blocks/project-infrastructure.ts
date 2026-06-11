import { z } from "zod";
import { defineBlock } from "./_core";

export const projectInfrastructureBlock = defineBlock({
  type: "project-infrastructure",
  label: "Инфраструктура на карте",
  icon: "i-solar-map-linear",
  description: "Карта инфраструктуры проекта с пинами по категориям",
  category: "project",
  fields: [
    { name: "projectId", type: "string", label: "Проект", required: true },
    { name: "mapHeight", type: "number", label: "Высота карты (px)", required: true },
    { name: "showCategories", type: "boolean", label: "Показывать фильтр по категориям", required: true },
  ],
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
