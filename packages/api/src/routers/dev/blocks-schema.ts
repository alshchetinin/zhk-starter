import { z } from "zod";
import type { BlockField } from "../../shared/blocks/_core";

export const fieldSchema: z.ZodType<BlockField> = z.lazy(() =>
  z
    .object({
      name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "camelCase имя"),
      type: z.enum([
        "string",
        "text",
        "richtext",
        "number",
        "boolean",
        "url",
        "image",
        "images",
        "strings",
        "select",
        "repeater",
      ]),
      label: z.string().min(1),
      options: z.array(z.string()).optional(),
      description: z.string().optional(),
      required: z.boolean(),
      default: z.unknown().optional(),
      subFields: z.array(fieldSchema).optional(),
      minItems: z.number().int().min(0).optional(),
      maxItems: z.number().int().min(1).optional(),
    })
    .superRefine((field, ctx) => {
      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "select требует непустой options",
          path: ["options"],
        });
      }
      if (field.type === "image" && field.required === true && field.default === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "default: null недопустим для обязательного image",
          path: ["default"],
        });
      }
    }),
);

export const blockInfoSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, "kebab-case имя блока"),
  label: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  category: z.enum(["content", "project"]).optional(),
  fields: z.array(fieldSchema).min(1),
});
