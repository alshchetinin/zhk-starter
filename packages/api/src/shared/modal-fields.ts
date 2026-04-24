import { z } from "zod";

export const modalFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["name", "phone", "email", "description", "checkbox"]),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  mask: z.string().optional(),
});

export type ModalField = z.infer<typeof modalFieldSchema>;

export const modalFieldsSchema = z.array(modalFieldSchema).default([]);
