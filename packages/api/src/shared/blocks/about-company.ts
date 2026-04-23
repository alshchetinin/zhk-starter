import { z } from "zod";
import { defineBlock } from "./_core";

export const aboutCompanyBlock = defineBlock({
  type: "about-company",
  label: "О компании",
  icon: "i-tabler-building-estate",
  description: "Секция о компании с описанием, изображением и статистикой",
  dataSchema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
    image: z.string().url(),
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
