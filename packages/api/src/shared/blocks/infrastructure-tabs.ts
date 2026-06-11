import { z } from "zod";
import { defineBlock } from "./_core";

export const infrastructureTabsBlock = defineBlock({
  type: "infrastructure-tabs",
  label: "Инфраструктура",
  icon: "i-solar-leaf-linear",
  description: "Секция инфраструктуры с табами и изображениями",
  fields: [
    { name: "subtitle", type: "string", label: "Подзаголовок", required: false },
    { name: "title", type: "string", label: "Заголовок", required: true },
    {
      name: "tabs", type: "repeater", label: "Табы", required: true,
      minItems: 2, maxItems: 8,
      subFields: [
        { name: "label", type: "string", label: "Название таба", required: true },
        { name: "title", type: "string", label: "Заголовок контента", required: true },
        { name: "description", type: "text", label: "Описание", required: false },
        { name: "image", type: "image", label: "Изображение", required: true },
      ],
    },
  ],
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
