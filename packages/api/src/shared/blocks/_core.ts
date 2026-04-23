import { z } from "zod";

export type BlockCategory = "content" | "project";

export interface BlockDefinition<Type extends string = string, Data = unknown> {
  type: Type;
  label: string;
  icon: string;
  description: string;
  category?: BlockCategory;
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
