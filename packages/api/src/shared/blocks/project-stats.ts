import { z } from "zod";
import { defineBlock } from "./_core";

export const projectStatsBlock = defineBlock({
  type: "project-stats",
  label: "Статистика квартир",
  icon: "i-solar-chart-2-linear",
  description: "Количество свободных и общее число квартир",
  category: "project",
  dataSchema: z.object({
    projectId: z.string().min(1),
    showFree: z.boolean().default(true),
    showTotal: z.boolean().default(true),
  }),
  defaultData: {
    projectId: "",
    showFree: true,
    showTotal: true,
  },
});
