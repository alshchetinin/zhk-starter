import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import { collectBlockInfo } from "./generate-block/prompts.js";
import type { BlockInfo } from "./generate-block/prompts.js";
import { FIELD_TYPES } from "./generate-block/field-types.js";
import { generateBlockDefinition } from "./generate-block/generators/block-definition.js";
import { generateEditorComponent } from "./generate-block/generators/editor-component.js";
import { generateWebRenderer } from "./generate-block/generators/web-renderer.js";
import { toPascalCase } from "./generate-block/utils.js";

const ROOT = path.resolve(import.meta.dirname, "..");

function printSummary(blockInfo: BlockInfo): void {
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
      `  + packages/api/src/shared/blocks/${blockInfo.name}.ts`,
      `  ~ packages/api/src/shared/blocks/index.ts`,
      `  + apps/admin/.../editors/${pascal}Block.vue`,
      `  + apps/web/.../renderers/${pascal}Block.vue`,
    ].join("\n"),
    "Сводка",
  );
}

function runGenerators(blockInfo: BlockInfo): void {
  const pascal = toPascalCase(blockInfo.name);
  const s = p.spinner();

  s.start("Создаю описание блока...");
  generateBlockDefinition(ROOT, blockInfo);
  s.stop(`Создан blocks/${blockInfo.name}.ts`);

  s.start("Создаю компонент редактора...");
  generateEditorComponent(ROOT, blockInfo);
  s.stop(`Создан editors/${pascal}Block.vue`);

  s.start("Создаю web-рендерер...");
  generateWebRenderer(ROOT, blockInfo);
  s.stop(`Создан renderers/${pascal}Block.vue`);
}

async function main() {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("--config");

  p.intro("Block Generator — ZHK Starter");

  let blockInfo: BlockInfo;

  if (configIdx !== -1 && args[configIdx + 1]) {
    const configPath = path.resolve(args[configIdx + 1]);
    if (!fs.existsSync(configPath)) {
      p.cancel(`Файл не найден: ${configPath}`);
      process.exit(1);
    }
    blockInfo = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    p.log.info(`Конфиг загружен из ${configPath}`);
  } else {
    blockInfo = await collectBlockInfo();
  }

  const blockFile = path.join(ROOT, "packages/api/src/shared/blocks", `${blockInfo.name}.ts`);
  if (fs.existsSync(blockFile)) {
    p.cancel(`Блок "${blockInfo.name}" уже существует (${blockFile})`);
    process.exit(1);
  }

  printSummary(blockInfo);

  if (configIdx === -1) {
    const confirmed = await p.confirm({ message: "Создать блок?" });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Отменено.");
      process.exit(0);
    }
  }

  runGenerators(blockInfo);

  p.outro(`Блок "${blockInfo.name}" успешно создан!`);
}

main().catch((err) => {
  p.cancel(`Ошибка: ${err.message}`);
  process.exit(1);
});
