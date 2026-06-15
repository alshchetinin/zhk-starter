import { z } from "zod";
import { defineBlock, imageValue } from "./_core";

export const temasBlock = defineBlock({
  type: "temas",
  label: "Команда",
  icon: "i-solar-ghost-linear",
  description: "Блок с командой",
  fields: [
    {
      name: "title",
      type: "string",
      label: "Заголовок",
      required: true,
    },
    {
      name: "member",
      type: "repeater",
      label: "Член команды",
      required: true,
      minItems: 2,
      maxItems: 4,
      subFields: [
        {
          name: "name",
          type: "string",
          label: "имя",
          required: true,
        },
        {
          name: "avatar",
          type: "image",
          label: "Аватар",
          required: true,
        },
      ],
    },
  ],
  dataSchema: z.object({
    title: z.string().min(1),
    member: z.array(z.object({
    name: z.string().min(1),
    avatar: imageValue,
  })).min(2).max(4),
  }),
  defaultData: {
    title: "",
    member: [],
  },
});
