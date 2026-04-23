import { z } from "zod";
import { defineBlock } from "./_core";

export const aboutProjectBlock = defineBlock({
  type: "about-project",
  label: "О проекте",
  icon: "i-tabler-building",
  description: "Секция о проекте с табами и слайдером изображений",
  dataSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    tabs: z.array(z.object({
      label: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      images: z.array(z.string().url()),
    })).min(2).max(6),
  }),
  defaultData: {
    title: "",
    description: undefined,
    tabs: [],
  },
});
