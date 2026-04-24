import { z } from "zod";
import { defineBlock } from "./_core";

export const contactsBlock = defineBlock({
  type: "contacts",
  label: "Контакты",
  icon: "i-tabler-address-book",
  description: "Секция контактов — выбор записей из справочника",
  dataSchema: z.object({
    title: z.string().optional(),
    contactIds: z.array(z.string()).default([]),
    showMap: z.boolean().default(true),
  }),
  defaultData: {
    title: "Контакты",
    contactIds: [],
    showMap: true,
  },
});
