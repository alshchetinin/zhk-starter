import fs from "node:fs";
import path from "node:path";

export interface CollectionNames {
  kebab: string;
  snake: string;
  camel: string;
  pascal: string;
  routerVar: string;
  relationsVar: string;
  label: string;
  singularLabel: string;
  labelRu: string;
  singularLabelRu: string;
}

export function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function deriveNames(
  kebab: string,
  labelRu: string,
  singularLabelRu: string,
): CollectionNames {
  const pascal = toPascalCase(kebab);
  const camel = toCamelCase(kebab);
  const snake = kebab.replace(/-/g, "_");
  const capitalized = kebab
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  const label = capitalized.join(" ");
  const singularLabel = label.endsWith("s") ? label.slice(0, -1) : label;

  return {
    kebab,
    snake,
    camel,
    pascal,
    routerVar: camel + "Router",
    relationsVar: camel + "Relations",
    label,
    singularLabel,
    labelRu,
    singularLabelRu,
  };
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

export function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}
