import { ORPCError } from "@orpc/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { devProcedure } from "../../index";
import { REPO_ROOT } from "../../utils/paths";
import { toCamelCase, toPascalCase } from "../../utils/naming";
import { blockInfoSchema } from "./blocks-schema";

const BLOCKS_DIR = path.join(REPO_ROOT, "packages/api/src/shared/blocks");
const PREVIEWS_DIR = path.join(REPO_ROOT, "apps/admin/public/block-previews");

function extractString(source: string, key: string): string | null {
  const match = source.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return match ? match[1]!.replace(/\\"/g, '"') : null;
}

interface DiskBlock {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: "content" | "project" | null;
  files: {
    definition: string;
    editor: string;
    renderer: string;
  };
}

/**
 * Reads block metadata by parsing the .ts files directly on disk.
 * Does not depend on ESM import cache, so reflects the current filesystem state.
 */
function readBlocksFromDisk(): DiskBlock[] {
  if (!fs.existsSync(BLOCKS_DIR)) return [];

  const files = fs
    .readdirSync(BLOCKS_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts" && !f.startsWith("_"));

  const blocks: DiskBlock[] = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(BLOCKS_DIR, file), "utf-8");
    const type = extractString(source, "type");
    const label = extractString(source, "label");
    const icon = extractString(source, "icon");
    const description = extractString(source, "description");
    const category = extractString(source, "category") as DiskBlock["category"];
    if (!type || !label || !icon || !description) continue;

    blocks.push({
      type,
      label,
      icon,
      description,
      category: category === "content" || category === "project" ? category : null,
      files: {
        definition: `packages/api/src/shared/blocks/${type}.ts`,
        editor: `apps/admin/app/components/blocks/editors/${toPascalCase(type)}Block.vue`,
        renderer: `apps/web/app/components/blocks/renderers/${toPascalCase(type)}Block.vue`,
      },
    });
  }

  return blocks.sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

export const devBlocksRouter = {
  list: devProcedure.handler(() => readBlocksFromDisk()),

  create: devProcedure
    .input(blockInfoSchema)
    .handler(async ({ input }) => {
      const existingTypes = readBlocksFromDisk().map((b) => b.type);
      if (existingTypes.includes(input.name)) {
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

      generateBlockDefinition(REPO_ROOT, input);
      generateEditorComponent(REPO_ROOT, input);
      generateWebRenderer(REPO_ROOT, input);

      return { type: input.name, ok: true };
    }),

  update: devProcedure
    .input(blockInfoSchema)
    .handler(async ({ input }) => {
      // Существование проверяем через readBlocksFromDisk, а не existsSync:
      // index.ts и _*.ts там отфильтрованы — name "index" не перезапишет реестр.
      if (!readBlocksFromDisk().some((b) => b.type === input.name)) {
        throw new ORPCError("NOT_FOUND", {
          message: `Блок "${input.name}" не найден`,
        });
      }

      const [{ updateBlockDefinition }, { generateEditorComponent }] = await Promise.all([
        import("../../../../../scripts/generate-block/generators/block-definition.js"),
        import("../../../../../scripts/generate-block/generators/editor-component.js"),
      ]);

      updateBlockDefinition(REPO_ROOT, input);
      try {
        generateEditorComponent(REPO_ROOT, input);
      } catch (err) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Определение обновлено, но генерация редактора упала: ${
            err instanceof Error ? err.message : String(err)
          }. Проверьте git diff.`,
        });
      }

      return { type: input.name, ok: true };
    }),

  uploadPreview: devProcedure
    .input(
      z.object({
        type: z.string().regex(/^[a-z][a-z0-9-]*$/),
        /** PNG в base64 без data:-префикса, до ~3 МБ файла */
        dataBase64: z.string().min(1).max(4_500_000),
      }),
    )
    .handler(({ input }) => {
      if (!readBlocksFromDisk().some((b) => b.type === input.type)) {
        throw new ORPCError("NOT_FOUND", {
          message: `Блок "${input.type}" не найден`,
        });
      }

      const buf = Buffer.from(input.dataBase64, "base64");
      const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_MAGIC)) {
        throw new ORPCError("BAD_REQUEST", { message: "Файл должен быть PNG" });
      }

      fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
      fs.writeFileSync(path.join(PREVIEWS_DIR, `${input.type}.png`), buf);

      return { ok: true, size: buf.length };
    }),

  delete: devProcedure
    .input(z.object({ type: z.string().regex(/^[a-z][a-z0-9-]*$/) }))
    .handler(async ({ input }) => {
      // readBlocksFromDisk фильтрует index.ts/_*.ts — name "index" не удалит реестр.
      if (!readBlocksFromDisk().some((b) => b.type === input.type)) {
        throw new ORPCError("NOT_FOUND", {
          message: `Блок "${input.type}" не найден`,
        });
      }
      const blockFile = path.join(BLOCKS_DIR, `${input.type}.ts`);

      const pascal = toPascalCase(input.type);
      const files = [
        blockFile,
        path.join(REPO_ROOT, `apps/admin/app/components/blocks/editors/${pascal}Block.vue`),
        path.join(REPO_ROOT, `apps/web/app/components/blocks/renderers/${pascal}Block.vue`),
        path.join(PREVIEWS_DIR, `${input.type}.png`),
      ];

      for (const file of files) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        }
      }

      const indexPath = path.join(BLOCKS_DIR, "index.ts");
      const camel = toCamelCase(input.type);
      let idx = fs.readFileSync(indexPath, "utf-8");
      idx = idx.replace(new RegExp(`\\nimport \\{ ${camel}Block \\} from "\\./${input.type}";`), "");
      idx = idx.replace(new RegExp(`  ${camel}Block,\\n`), "");
      fs.writeFileSync(indexPath, idx, "utf-8");

      return { type: input.type, ok: true };
    }),
};
