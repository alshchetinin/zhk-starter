import { z } from "zod";
import { defineBlock } from "./_core";

export const aboutFeaturesBlock = defineBlock({
  type: "about-features",
  label: "Карточки о проекте",
  icon: "i-tabler-layout-grid",
  description: "Секция с карточками-преимуществами проекта с изображениями",
  dataSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    items: z.array(z.object({
      title: z.string().min(1),
      image: z.string().url(),
    })).min(2).max(6),
  }),
  defaultData: {
    title: "",
    description: undefined,
    items: [],
  },
});
