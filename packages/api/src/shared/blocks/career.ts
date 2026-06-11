import { z } from "zod";
import { defineBlock } from "./_core";

export const careerBlock = defineBlock({
  type: "career",
  label: "Карьера",
  icon: "i-solar-case-linear",
  description: "Секция с вакансиями компании",
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
