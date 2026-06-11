import { z } from "zod";
import { defineBlock } from "./_core";

export const aboutFeaturesBlock = defineBlock({
  type: "about-features",
  label: "Карточки о проекте",
  icon: "i-solar-widget-linear",
  description: "Секция с карточками-преимуществами проекта с изображениями",
  fields: [
    {
      name: "title",
      type: "string",
      label: "Заголовок",
      required: true,
    },
    {
      name: "description",
      type: "text",
      label: "Описание",
      required: false,
    },
    {
      name: "items",
      type: "repeater",
      label: "Карточки",
      required: true,
      minItems: 2,
      maxItems: 6,
      subFields: [
        {
          name: "title",
          type: "string",
          label: "Подпись",
          required: true,
        },
        {
          name: "image",
          type: "image",
          label: "Изображение",
          required: true,
        },
      ],
    },
  ],
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
