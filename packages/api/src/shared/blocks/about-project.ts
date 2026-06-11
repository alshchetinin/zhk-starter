import { z } from "zod";
import { defineBlock } from "./_core";

export const aboutProjectBlock = defineBlock({
  type: "about-project",
  label: "О проекте",
  icon: "i-solar-buildings-linear",
  description: "Секция о проекте с табами и слайдером изображений",
  fields: [
    { name: "title", type: "string", label: "Заголовок", required: true },
    { name: "description", type: "text", label: "Описание", required: false },
    {
      name: "tabs", type: "repeater", label: "Табы", required: true,
      minItems: 2, maxItems: 6,
      subFields: [
        { name: "label", type: "string", label: "Название таба", required: true },
        { name: "title", type: "string", label: "Заголовок контента", required: true },
        { name: "description", type: "text", label: "Описание контента", required: false },
        { name: "images", type: "images", label: "Слайдер изображений", required: true },
      ],
    },
  ],
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
