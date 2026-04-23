import { z } from "zod";
import { defineBlock } from "./_core";

export const temasBlock = defineBlock({
  type: "temas",
  label: "Команда",
  icon: "i-tabler-ghost-3",
  description: "Блок с командой",
  dataSchema: z.object({
    title: z.string().min(1),
    member: z.array(z.object({
      name: z.string().min(1),
      avatar: z.string().url(),
    })).min(2).max(4),
  }),
  defaultData: {
    title: "",
    member: [],
  },
});
