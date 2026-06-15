import { z } from "zod";
import { defineBlock, imageValue } from "./_core";

export const aboutCompanyBlock = defineBlock({
  type: "about-company",
  label: "О компании",
  icon: "i-solar-buildings-3-linear",
  description: "Секция о компании с описанием, изображением и статистикой",
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
      name: "buttonLabel",
      type: "string",
      label: "Текст ссылки",
      required: false,
    },
    {
      name: "buttonUrl",
      type: "url",
      label: "URL ссылки",
      required: false,
    },
    {
      name: "image",
      type: "image",
      label: "Изображение",
      required: true,
    },
    {
      name: "stats",
      type: "repeater",
      label: "Статистика",
      required: true,
      minItems: 2,
      maxItems: 6,
      subFields: [
        {
          name: "value",
          type: "string",
          label: "Значение",
          required: true,
        },
        {
          name: "label",
          type: "string",
          label: "Подпись",
          required: true,
        },
      ],
    },
  ],
  dataSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
    image: imageValue,
    stats: z.array(z.object({
    value: z.string().min(1),
    label: z.string().min(1),
  })).min(2).max(6),
  }),
  defaultData: {
    title: "",
    description: undefined,
    buttonLabel: undefined,
    buttonUrl: undefined,
    image: null as unknown as string,
    stats: [],
  },
});
