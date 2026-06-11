import { z } from "zod";

export type BlockCategory = "content" | "project";

export const BLOCK_FIELD_TYPES = [
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
] as const;

export type BlockFieldType = (typeof BLOCK_FIELD_TYPES)[number];

/**
 * Декларативное описание поля блока — единый source of truth для
 * dev-билдера (/dev/blocks), CLI-генератора и admin-форм.
 */
export interface BlockField {
  name: string;
  type: BlockFieldType;
  label: string;
  required: boolean;
  /** значение в defaultData, если отличается от канонического для типа */
  default?: unknown;
  description?: string;
  /** только для select */
  options?: string[];
  /** только для repeater */
  minItems?: number;
  maxItems?: number;
  subFields?: BlockField[];
}

export interface BlockDefinition<Type extends string = string, Data = unknown> {
  type: Type;
  label: string;
  icon: string;
  description: string;
  category?: BlockCategory;
  fields: BlockField[];
  dataSchema: z.ZodType<Data>;
  defaultData: Data;
  schema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<Type>;
    data: z.ZodType<Data>;
  }>;
}

interface DefineBlockInput<Type extends string, Data> {
  type: Type;
  label: string;
  icon: string;
  description: string;
  category?: BlockCategory;
  fields: BlockField[];
  dataSchema: z.ZodType<Data>;
  defaultData: Data;
}

export function defineBlock<Type extends string, Data>(
  input: DefineBlockInput<Type, Data>,
): BlockDefinition<Type, Data> {
  const schema = z.object({
    id: z.string(),
    type: z.literal(input.type),
    data: input.dataSchema,
  });
  return { ...input, schema };
}
