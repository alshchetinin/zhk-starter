import { z } from "zod";
import { defineBlock } from "./_core";

export const infrastructureTabsBlock = defineBlock({
  type: "infrastructure-tabs",
  label: "Инфраструктура",
  icon: "i-tabler-trees",
  description: "Секция инфраструктуры с табами и изображениями",
  dataSchema: z.object({
    subtitle: z.string().optional(),
    title: z.string().min(1),
    tabs: z.array(z.object({
      label: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      image: z.string().url(),
    })).min(2).max(8),
  }),
  defaultData: {
    subtitle: undefined,
    title: "",
    tabs: [],
  },
});
