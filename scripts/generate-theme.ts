import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import { themeConfigSchema } from "../packages/api/src/shared/theme.js";
import { applyThemeToCss } from "./generate-theme/css-builder.js";
import { buildFontConfig } from "./generate-theme/font-config.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSS_PATH = path.join(ROOT, "apps/web/app/assets/css/main.css");
const FONT_CONFIG_PATH = path.join(ROOT, "apps/web/app/theme.generated.json");

async function main() {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("--config");

  p.intro("Theme Generator — ZHK Starter");

  if (configIdx === -1 || !args[configIdx + 1]) {
    p.cancel("Использование: pnpm generate:theme --config design/theme.json");
    process.exit(1);
  }

  // 1. Read and validate config
  const configPath = path.resolve(args[configIdx + 1]);
  if (!fs.existsSync(configPath)) {
    p.cancel(`Файл не найден: ${configPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const result = themeConfigSchema.safeParse(raw);
  if (!result.success) {
    p.cancel(`Невалидный конфиг:\n${result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    process.exit(1);
  }

  const config = result.data;
  p.log.info(`Тема: "${config.name}"`);

  const s = p.spinner();

  // 2. Generate CSS
  s.start("Генерирую CSS...");
  const cssContent = fs.readFileSync(CSS_PATH, "utf-8");
  const newCss = applyThemeToCss(cssContent, config);
  fs.writeFileSync(CSS_PATH, newCss, "utf-8");
  s.stop("CSS обновлён");

  // 3. Generate font config
  s.start("Генерирую конфиг шрифтов...");
  const fontConfig = buildFontConfig(config.typography);
  fs.writeFileSync(FONT_CONFIG_PATH, JSON.stringify(fontConfig, null, 2) + "\n", "utf-8");
  s.stop("Конфиг шрифтов создан");

  p.note(
    [
      `Цвета: brand hue ${config.colors.brandHue}, surface hue ${config.colors.surfaceHue}`,
      `Шрифты: ${config.typography.fontSans}${config.typography.fontDisplay !== config.typography.fontSans ? ` + ${config.typography.fontDisplay}` : ""}`,
      `Стиль: radius=${config.style.radiusProfile}, density=${config.style.density}`,
      `Анимации: ${config.animation.intensity}, ${config.animation.feel}`,
      ``,
      `Файлы:`,
      `  ~ apps/web/app/assets/css/main.css`,
      `  + apps/web/app/theme.generated.json`,
    ].join("\n"),
    "Результат",
  );

  p.outro(`Тема "${config.name}" успешно применена!`);
}

main().catch((err) => {
  p.cancel(`Ошибка: ${err.message}`);
  process.exit(1);
});
