import { ORPCError } from "@orpc/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { devProcedure } from "../../index";
import { blockDefinitions, allBlocks } from "../../shared/blocks";

// blocks.ts is at packages/api/src/routers/dev/blocks.ts — 5 dirs up to repo root
const REPO_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../../..",
);

const fieldSchema: z.ZodType<{
  name: string;
  type: string;
  label: string;
  options?: string[];
  description?: string;
  required: boolean;
  subFields?: unknown[];
  minItems?: number;
  maxItems?: number;
}> = z.lazy(() =>
  z.object({
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
      "select",
      "repeater",
    ]),
    label: z.string().min(1),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
    required: z.boolean(),
    subFields: z.array(fieldSchema).optional(),
    minItems: z.number().int().min(0).optional(),
    maxItems: z.number().int().min(1).optional(),
  }),
);

const blockInfoSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, "kebab-case имя блока"),
  label: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  category: z.enum(["content", "project"]).optional(),
  fields: z.array(fieldSchema).min(1),
});

function toPascalCase(s: string): string {
  return s.split("-").map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");
}

export const devBlocksRouter = {
  list: devProcedure.handler(() => {
    return allBlocks.map((b) => ({
      type: b.type,
      label: b.label,
      icon: b.icon,
      description: b.description,
      category: b.category ?? null,
      files: {
        definition: `packages/api/src/shared/blocks/${b.type}.ts`,
        editor: `apps/admin/app/components/blocks/editors/${toPascalCase(b.type)}Block.vue`,
        renderer: `apps/web/app/components/blocks/renderers/${toPascalCase(b.type)}Block.vue`,
      },
    }));
  }),

  create: devProcedure
    .input(blockInfoSchema)
    .handler(async ({ input }) => {
      if (blockDefinitions.some((b) => b.type === input.name)) {
        throw new ORPCError("CONFLICT", {
          message: `Блок "${input.name}" уже существует`,
        });
      }

      const [
        { generateBlockDefinition },
        { generateEditorComponent },
        { generateWebRenderer },
      ] = await Promise.all([
        import("../../../../../scripts/generate-block/generators/block-definition.js"),
        import("../../../../../scripts/generate-block/generators/editor-component.js"),
        import("../../../../../scripts/generate-block/generators/web-renderer.js"),
      ]);

      // BlockInfo shape matches input 1:1
      const blockInfo = input as unknown as Parameters<typeof generateBlockDefinition>[1];

      generateBlockDefinition(REPO_ROOT, blockInfo);
      generateEditorComponent(REPO_ROOT, blockInfo);
      generateWebRenderer(REPO_ROOT, blockInfo);

      return { type: input.name, ok: true };
    }),

  delete: devProcedure
    .input(z.object({ type: z.string().min(1) }))
    .handler(async ({ input }) => {
      if (!blockDefinitions.some((b) => b.type === input.type)) {
        throw new ORPCError("NOT_FOUND", {
          message: `Блок "${input.type}" не найден`,
        });
      }

      const pascal = toPascalCase(input.type);
      const files = [
        path.join(REPO_ROOT, `packages/api/src/shared/blocks/${input.type}.ts`),
        path.join(REPO_ROOT, `apps/admin/app/components/blocks/editors/${pascal}Block.vue`),
        path.join(REPO_ROOT, `apps/web/app/components/blocks/renderers/${pascal}Block.vue`),
      ];

      for (const file of files) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }

      // Remove import + entry from blocks/index.ts
      const indexPath = path.join(REPO_ROOT, "packages/api/src/shared/blocks/index.ts");
      let idx = fs.readFileSync(indexPath, "utf-8");
      const camel = input.type.split("-").map((p, i) => i === 0 ? p : p[0]!.toUpperCase() + p.slice(1)).join("");
      idx = idx.replace(new RegExp(`\\nimport \\{ ${camel}Block \\} from "\\./${input.type}";`), "");
      idx = idx.replace(new RegExp(`  ${camel}Block,\\n`), "");
      fs.writeFileSync(indexPath, idx, "utf-8");

      return { type: input.type, ok: true };
    }),
};
