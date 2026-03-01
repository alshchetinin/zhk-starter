import path from "node:path";
import { readFile, writeFile, type CollectionNames } from "../utils.js";

export function registerNavItem(
  rootDir: string,
  names: CollectionNames,
  icon: string,
): void {
  const filePath = path.join(
    rootDir,
    "apps/admin/app/composables/useNavigation.ts",
  );
  let content = readFile(filePath);

  const navEntry = `  { label: "${names.labelRu}", icon: "${icon}", to: "/${names.kebab}" },`;

  if (content.includes(`to: "/${names.kebab}"`)) return;

  // Find contentItems array and insert before its closing "];"
  const contentItemsStart = content.indexOf("const contentItems");
  if (contentItemsStart === -1) {
    throw new Error("Could not find contentItems in useNavigation.ts");
  }

  const closingBracket = content.indexOf("];", contentItemsStart);
  if (closingBracket === -1) {
    throw new Error("Could not find closing ]; of contentItems");
  }

  content =
    content.slice(0, closingBracket) +
    navEntry +
    "\n" +
    content.slice(closingBracket);

  writeFile(filePath, content);
}
