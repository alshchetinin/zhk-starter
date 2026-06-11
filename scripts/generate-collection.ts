import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import path from "node:path";
import { deriveNames, fileExists, writeFile } from "./generate-collection/utils.js";
import { collectFields } from "./generate-collection/prompts.js";
import { COLLECTION_FIELD_TYPES } from "./generate-collection/field-types.js";
import { generateSchemaTemplate } from "./generate-collection/templates/schema.js";
import { generateRouterTemplate } from "./generate-collection/templates/router.js";
import { generateListPageTemplate } from "./generate-collection/templates/page-list.js";
import { generateDetailPageTemplate } from "./generate-collection/templates/page-detail.js";
import { generateCreatePageTemplate } from "./generate-collection/templates/page-create.js";
import { registerSchemaExport } from "./generate-collection/registrations/schema-index.js";
import { registerRouterImport } from "./generate-collection/registrations/router-index.js";
import { registerNavItem } from "./generate-collection/registrations/navigation.js";

const ROOT = path.resolve(import.meta.dirname, "..");

async function main() {
  p.intro("Collection Generator — ZHK Starter");

  const nameInput = await p.text({
    message: "Имя коллекции (kebab-case, например: team-members):",
    validate(value) {
      if (!value) return "Имя обязательно";
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value))
        return "Используйте kebab-case: только строчные буквы, цифры и дефис";
      return undefined;
    },
  });
  if (p.isCancel(nameInput)) process.exit(0);

  const labelRu = await p.text({
    message: "Название на русском (мн. число, например: Новости):",
    validate(v) {
      if (!v) return "Обязательно";
      return undefined;
    },
  });
  if (p.isCancel(labelRu)) process.exit(0);

  const singularLabelRu = await p.text({
    message: "Название на русском (ед. число, например: Новость):",
    validate(v) {
      if (!v) return "Обязательно";
      return undefined;
    },
  });
  if (p.isCancel(singularLabelRu)) process.exit(0);

  const iconInput = await p.text({
    message: "Solar-иконка для навигации (Enter — i-solar-list-linear):",
    initialValue: "i-solar-",
    validate(value) {
      if (value && !value.startsWith("i-solar-"))
        return "Иконка должна начинаться с i-solar-";
      return undefined;
    },
  });
  if (p.isCancel(iconInput)) process.exit(0);
  const icon =
    !iconInput || iconInput === "i-solar-" ? "i-solar-list-linear" : iconInput;

  const names = deriveNames(nameInput, labelRu, singularLabelRu);

  // Collect additional fields
  const wantFields = await p.confirm({
    message: "Добавить дополнительные поля (кроме title)?",
    initialValue: true,
  });
  if (p.isCancel(wantFields)) process.exit(0);

  const fields = wantFields ? await collectFields() : [];

  // Build summary
  const fieldsTable = fields.length
    ? fields
        .map((f) => {
          const ft = COLLECTION_FIELD_TYPES[f.type];
          const req = f.required ? " *" : "";
          return `  ${f.name} (${ft?.label ?? f.type})${req} — ${f.label}`;
        })
        .join("\n")
    : "  (только title)";

  const filesToCreate = [
    {
      label: "DB Schema",
      path: path.join(ROOT, `packages/db/src/schema/${names.kebab}.ts`),
      content: generateSchemaTemplate(names, fields),
    },
    {
      label: "API Router",
      path: path.join(ROOT, `packages/api/src/routers/${names.kebab}.ts`),
      content: generateRouterTemplate(names, fields),
    },
    {
      label: "List Page",
      path: path.join(ROOT, `apps/admin/app/pages/${names.kebab}/index.vue`),
      content: generateListPageTemplate(names),
    },
    {
      label: "Detail Page",
      path: path.join(ROOT, `apps/admin/app/pages/${names.kebab}/[id].vue`),
      content: generateDetailPageTemplate(names, fields),
    },
    {
      label: "Create Page",
      path: path.join(ROOT, `apps/admin/app/pages/${names.kebab}/create.vue`),
      content: generateCreatePageTemplate(names, fields),
    },
  ];

  const existingFiles = filesToCreate.filter((f) => fileExists(f.path));
  if (existingFiles.length > 0) {
    p.log.warn("Следующие файлы уже существуют:");
    existingFiles.forEach((f) => p.log.warn(`  ${f.path}`));
    const overwrite = await p.confirm({
      message: "Перезаписать?",
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Отменено.");
      process.exit(0);
    }
  }

  const relativePaths = filesToCreate.map(
    (f) =>
      `  ${existingFiles.includes(f) ? "~" : "+"} ${f.label}: ${path.relative(ROOT, f.path)}`,
  );

  p.note(
    [
      `Коллекция: ${names.camel}`,
      `Таблица: ${names.snake}`,
      `Роутер: ${names.routerVar}`,
      `Русское название: ${names.labelRu} / ${names.singularLabelRu}`,
      `Иконка: ${icon}`,
      ``,
      `Поля:`,
      fieldsTable,
      ``,
      `Файлы:`,
      ...relativePaths,
      `  ~ packages/db/src/schema/index.ts`,
      `  ~ packages/api/src/routers/index.ts`,
      `  ~ apps/admin/app/composables/useNavigation.ts`,
    ].join("\n"),
    "Сводка",
  );

  const confirmed = await p.confirm({ message: "Создать коллекцию?" });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Отменено.");
    process.exit(0);
  }

  const s = p.spinner();

  for (const file of filesToCreate) {
    s.start(`Создаю ${file.label}...`);
    writeFile(file.path, file.content);
    s.stop(`${file.label} создан`);
  }

  s.start("Регистрирую в schema/index.ts...");
  registerSchemaExport(ROOT, names);
  s.stop("Schema export добавлен");

  s.start("Регистрирую в routers/index.ts...");
  registerRouterImport(ROOT, names);
  s.stop("Router import добавлен");

  s.start("Добавляю в навигацию...");
  registerNavItem(ROOT, names, icon);
  s.stop("Навигация обновлена");

  s.start("Применяю миграцию (db:push)...");
  try {
    execSync("pnpm db:push", { cwd: ROOT, stdio: "pipe" });
    s.stop("Миграция применена");
  } catch (err) {
    s.stop("Ошибка миграции — запустите pnpm db:push вручную");
    p.log.warn(String((err as { stderr?: Buffer })?.stderr ?? err));
  }

  p.note(
    [
      `Коллекция готова! Перезапустите dev-сервер.`,
      ``,
      `Файлы для кастомизации:`,
      `  packages/db/src/schema/${names.kebab}.ts`,
      `  packages/api/src/routers/${names.kebab}.ts`,
      `  apps/admin/app/pages/${names.kebab}/[id].vue`,
      `  apps/admin/app/pages/${names.kebab}/create.vue`,
    ].join("\n"),
    "Дальнейшие действия",
  );

  p.outro(`Коллекция "${names.labelRu}" успешно создана!`);
}

main().catch((err) => {
  p.cancel(`Ошибка: ${err.message}`);
  process.exit(1);
});
