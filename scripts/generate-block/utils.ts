import fs from "node:fs";

export function insertBeforeMarker(
  fileContent: string,
  marker: string,
  codeToInsert: string,
): string {
  const markerIndex = fileContent.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(
      `Маркер "${marker}" не найден. Убедитесь, что он не был удалён из файла.`,
    );
  }

  const lineStart = fileContent.lastIndexOf("\n", markerIndex) + 1;

  return (
    fileContent.slice(0, lineStart) +
    codeToInsert +
    "\n" +
    fileContent.slice(lineStart)
  );
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, "utf-8");
}

export function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
