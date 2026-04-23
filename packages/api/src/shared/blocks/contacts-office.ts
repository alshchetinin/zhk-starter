import { z } from "zod";
import { defineBlock } from "./_core";

export const contactsOfficeBlock = defineBlock({
  type: "contacts-office",
  label: "Контакты",
  icon: "i-tabler-address-book",
  description: "Секция контактов с адресом, картой, отделами и соцсетями",
  dataSchema: z.object({
    title: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().min(1),
    address: z.string().min(1),
    mapCoordinates: z.string().optional(),
    buttonLabel: z.string().optional(),
    buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
    socials: z.array(z.object({
      type: z.enum(["telegram", "whatsapp", "vk"]),
      url: z.union([z.string().url(), z.literal("")]),
    })).min(1).max(5).optional(),
    departments: z.array(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().min(1),
    })).min(1).max(8),
  }),
  defaultData: {
    title: "",
    phone: "",
    email: "",
    address: "",
    mapCoordinates: undefined,
    buttonLabel: undefined,
    buttonUrl: undefined,
    socials: undefined,
    departments: [],
  },
});
