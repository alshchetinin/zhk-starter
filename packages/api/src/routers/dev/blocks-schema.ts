import { z } from "zod";
import { BLOCK_FIELD_TYPES } from "../../shared/blocks/_core";
import type { BlockField } from "../../shared/blocks/_core";

function refineField(field: BlockField, ctx: z.RefinementCtx): void {
  if (field.type === "select" && (!field.options || field.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "select требует непустой options",
      path: ["options"],
    });
  }

  if (field.type === "repeater" && !field.subFields?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "repeater требует хотя бы одно под-поле",
      path: ["subFields"],
    });
  }

  if (
    field.minItems !== undefined &&
    field.maxItems !== undefined &&
    field.minItems > field.maxItems
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minItems не может быть больше maxItems",
      path: ["minItems"],
    });
  }

  // resolveDefaultValue эмитит JSON.stringify(default) для всех типов —
  // null компилируется только у nullable (необязательного) image.
  if (field.default === null && !(field.type === "image" && !field.required)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "default: null допустим только для необязательного image",
      path: ["default"],
    });
  }

  const subFields = field.subFields ?? [];
  const seenNames = new Set<string>();
  subFields.forEach((sub, i) => {
    if (sub.type === "repeater") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "repeater внутри subFields запрещён",
        path: ["subFields", i, "type"],
      });
    }
    if (seenNames.has(sub.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `дубликат имени поля "${sub.name}" в subFields`,
        path: ["subFields", i, "name"],
      });
    }
    seenNames.add(sub.name);
  });
}

export const fieldSchema: z.ZodType<BlockField> = z.lazy(() =>
  z
    .object({
      name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "camelCase имя"),
      type: z.enum(BLOCK_FIELD_TYPES),
      label: z.string().min(1),
      options: z.array(z.string()).optional(),
      description: z.string().optional(),
      required: z.boolean(),
      default: z.unknown().optional(),
      subFields: z.array(fieldSchema).optional(),
      minItems: z.number().int().min(0).optional(),
      maxItems: z.number().int().min(1).optional(),
    })
    .superRefine(refineField),
);

export const blockInfoSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, "kebab-case имя блока"),
    label: z.string().min(1),
    description: z.string().min(1),
    icon: z.string().min(1),
    category: z.enum(["content", "project"]).optional(),
    fields: z.array(fieldSchema).min(1),
  })
  .superRefine((block, ctx) => {
    const seenNames = new Set<string>();
    block.fields.forEach((field, i) => {
      if (seenNames.has(field.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `дубликат имени поля "${field.name}"`,
          path: ["fields", i, "name"],
        });
      }
      seenNames.add(field.name);
    });
  });
