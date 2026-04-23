import { z } from "zod";
import { defineBlock } from "./_core";

export const projectLocationBlock = defineBlock({
  type: "project-location",
  label: "Карта и адрес",
  icon: "i-tabler-map-pin",
  description: "Карта и адрес проекта",
  category: "project",
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
