import { z } from "zod";
import { defineBlock } from "./_core";

export const testTetBlock = defineBlock({
  type: "test-tet",
  label: "Тестовый",
  icon: "i-tabler-box",
  description: "sdf",
  category: "content",
  dataSchema: z.object({
    tets: z.string().min(1),
  }),
  defaultData: {
    tets: "",
  },
});
