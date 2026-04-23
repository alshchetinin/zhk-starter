export function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join("");
}

export function toCamelCase(kebab: string): string {
  const pascal = toPascalCase(kebab);
  return pascal[0]!.toLowerCase() + pascal.slice(1);
}
