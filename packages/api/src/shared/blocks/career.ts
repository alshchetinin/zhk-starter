import { z } from "zod";
import { defineBlock } from "./_core";

export const careerBlock = defineBlock({
  type: "career",
  label: "Карьера",
  icon: "i-solar-case-linear",
  description: "Секция с вакансиями компании",
  fields: [
    { name: "title", type: "string", label: "Заголовок", required: true },
    { name: "description", type: "text", label: "Описание", required: false },
    { name: "buttonLabel", type: "string", label: "Текст кнопки", required: false },
    { name: "buttonUrl", type: "url", label: "URL кнопки", required: false },
    {
      name: "vacancies", type: "repeater", label: "Вакансии", required: true,
      minItems: 1, maxItems: 12,
      subFields: [
        { name: "title", type: "string", label: "Название", required: true },
        { name: "location", type: "string", label: "Город", required: true },
        { name: "company", type: "string", label: "Компания / объект", required: true },
        { name: "url", type: "url", label: "Ссылка", required: false },
      ],
    },
  ],
  dataSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
    vacancies: z.array(z.object({
      title: z.string().min(1),
      location: z.string().min(1),
      company: z.string().min(1),
      url: z.union([z.string().url(), z.literal("")]).optional(),
    })).min(1).max(12),
  }),
  defaultData: {
    title: "",
    description: undefined,
    buttonLabel: undefined,
    buttonUrl: undefined,
    vacancies: [],
  },
});
