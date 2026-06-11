import { z } from "zod";
import { defineBlock } from "./_core";

export const contactsBlock = defineBlock({
  type: "contacts",
  label: "Контакты",
  icon: "i-solar-notebook-linear",
  description: "Секция контактов — выбор записей из справочника",
  fields: [
    { name: "title", type: "string", label: "Заголовок", required: false },
    {
      name: "contactIds", type: "images", label: "Контакты", required: true,
      description: "Выберите записи из справочника контактов",
    },
    { name: "showMap", type: "boolean", label: "Показывать карту", required: true },
  ],
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
