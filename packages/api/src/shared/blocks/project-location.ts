import { z } from "zod";
import { defineBlock } from "./_core";

export const projectLocationBlock = defineBlock({
  type: "project-location",
  label: "Карта и адрес",
  icon: "i-solar-map-point-linear",
  description: "Карта и адрес проекта",
  category: "project",
  fields: [
    { name: "projectId", type: "string", label: "Проект", required: true },
    { name: "showAddress", type: "boolean", label: "Показывать адрес", required: true },
    { name: "mapHeight", type: "number", label: "Высота карты (px)", required: true },
  ],
  dataSchema: z.object({
    projectId: z.string().min(1),
    showAddress: z.boolean().default(true),
    mapHeight: z.number().default(400),
  }),
  defaultData: {
    projectId: "",
    showAddress: true,
    mapHeight: 400,
  },
});
