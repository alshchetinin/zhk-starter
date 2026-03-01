import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import { collectBlockInfo } from "./generate-block/prompts.js";
import { FIELD_TYPES } from "./generate-block/field-types.js";
import { generateSchema } from "./generate-block/generators/schema.js";
import { generateEditorComponent } from "./generate-block/generators/editor-component.js";
import { updateEditorRegistry } from "./generate-block/generators/editor-registry.js";
import { updateDynamicZone } from "./generate-block/generators/dynamic-zone.js";
import { toPascalCase } from "./generate-block/utils.js";

const ROOT = path.resolve(import.meta.dirname, "..");

async function main() {
  p.intro("Block Generator — ZHK Starter");

  const blockInfo = await collectBlockInfo();

  // Check for duplicate block
  const blocksPath = path.join(ROOT, "packages/api/src/shared/blocks.ts");
  const blocksContent = fs.readFileSync(blocksPath, "utf-8");
  if (blocksContent.includes(`z.literal("${blockInfo.name}")`)) {
    p.cancel(`Блок "${blockInfo.name}" уже существует в blocks.ts`);
    process.exit(1);
  }

  // Summary
  const fieldsTable = blockInfo.fields
    .map((f) => {
      const req = f.required ? "" : " [опционально]";
      const desc = f.description ? ` — ${f.description}` : "";
      let line = `  ${f.name} (${FIELD_TYPES[f.type]!.label})${req}${desc}`;

      if (f.type === "repeater" && f.subFields) {
        const constraints: string[] = [];
        if (f.minItems !== undefined && f.minItems > 0) constraints.push(`min: ${f.minItems}`);
        if (f.maxItems !== undefined) constraints.push(`max: ${f.maxItems}`);
        if (constraints.length) line += ` [${constraints.join(", ")}]`;

        const subLines = f.subFields.map((sf) => {
          const sReq = sf.required ? "" : " [опц]";
          return `    ↳ ${sf.name} (${FIELD_TYPES[sf.type]!.label})${sReq}`;
        });
        line += "\n" + subLines.join("\n");
      }

      return line;
    })
    .join("\n");

  const pascal = toPascalCase(blockInfo.name);

  p.note(
    [
      `Блок: ${blockInfo.name}`,
      `Label: ${blockInfo.label}`,
      `Иконка: ${blockInfo.icon}`,
      ``,
      `Поля:`,
      fieldsTable,
      ``,
      `Файлы:`,
      `  ~ packages/api/src/shared/blocks.ts`,
      `  + apps/admin/.../editors/${pascal}Block.vue`,
      `  ~ apps/admin/.../editors/index.ts`,
      `  ~ apps/admin/.../BlockDynamicZone.vue`,
    ].join("\n"),
    "Сводка",
  );

  const confirmed = await p.confirm({ message: "Создать блок?" });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Отменено.");
    process.exit(0);
  }

  const s = p.spinner();

  s.start("Обновляю Zod-схемы...");
  generateSchema(blocksPath, blockInfo);
  s.stop("Zod-схемы обновлены");

  s.start("Создаю компонент редактора...");
  generateEditorComponent(ROOT, blockInfo);
  s.stop(`Создан ${pascal}Block.vue`);

  s.start("Обновляю реестр компонентов...");
  updateEditorRegistry(ROOT, blockInfo);
  s.stop("Реестр обновлён");

  s.start("Обновляю BlockDynamicZone...");
  updateDynamicZone(ROOT, blockInfo);
  s.stop("BlockDynamicZone обновлён");

  p.outro(`Блок "${blockInfo.name}" успешно создан!`);
}

main().catch((err) => {
  p.cancel(`Ошибка: ${err.message}`);
  process.exit(1);
});
