import { ORPCError } from "@orpc/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { devProcedure } from "../../index";

const REPO_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../../..",
);

const PAGES_DIR = path.join(REPO_ROOT, "apps/admin/app/pages");
const NAV_FILE = path.join(REPO_ROOT, "apps/admin/app/composables/useNavigation.ts");

const fieldSchema = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  type: z.enum(["string", "textarea", "number", "boolean", "image", "images", "dynamic-blocks"]),
  label: z.string().min(1),
  required: z.boolean(),
});

const collectionInfoSchema = z.object({
  kebab: z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, "kebab-case"),
  labelRu: z.string().min(1),
  singularLabelRu: z.string().min(1),
  icon: z.string().regex(/^i-tabler-/, "Должно начинаться с i-tabler-"),
  fields: z.array(fieldSchema),
});

interface DiskCollection {
  kebab: string;
  label: string | null;
  icon: string | null;
  section: "content" | "catalog" | "system" | null;
}

/** Scan admin pages directory for CRUD-shaped collections. */
function readCollectionsFromDisk(): DiskCollection[] {
  if (!fs.existsSync(PAGES_DIR)) return [];

  const navContent = fs.existsSync(NAV_FILE) ? fs.readFileSync(NAV_FILE, "utf-8") : "";

  function findInNav(
    kebab: string,
  ): { label: string | null; icon: string | null; section: DiskCollection["section"] } {
    const escaped = kebab.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const entryRe = new RegExp(
      `\\{[^}]*label:\\s*"([^"]+)"[^}]*icon:\\s*"([^"]+)"[^}]*to:\\s*"/${escaped}"[^}]*\\}`,
    );
    const match = navContent.match(entryRe);
    if (!match) return { label: null, icon: null, section: null };

    const arrays = ["contentItems", "catalogItems", "systemItems"] as const;
    let section: DiskCollection["section"] = null;
    for (const arr of arrays) {
      const start = navContent.indexOf(`const ${arr}`);
      if (start === -1) continue;
      const end = navContent.indexOf("];", start);
      if (end === -1) continue;
      const idx = navContent.indexOf(match[0], start);
      if (idx !== -1 && idx < end) {
        section = arr === "contentItems" ? "content" : arr === "catalogItems" ? "catalog" : "system";
        break;
      }
    }
    return { label: match[1]!, icon: match[2]!, section };
  }

  const dirs = fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "dev")
    .map((d) => d.name);

  const collections: DiskCollection[] = [];
  for (const dir of dirs) {
    const dirPath = path.join(PAGES_DIR, dir);
    const hasIndex = fs.existsSync(path.join(dirPath, "index.vue"));
    const hasCreate = fs.existsSync(path.join(dirPath, "create.vue"));
    const hasDetail = fs.existsSync(path.join(dirPath, "[id].vue"));
    if (!(hasIndex && hasCreate && hasDetail)) continue;

    const meta = findInNav(dir);
    collections.push({
      kebab: dir,
      label: meta.label,
      icon: meta.icon,
      section: meta.section,
    });
  }

  return collections.sort((a, b) => a.kebab.localeCompare(b.kebab));
}

/**
 * Find files outside the collection's own 5 files that reference it.
 * Checks: drizzle query usage (query.<camel>), bare table identifier in imports
 * from @zhk/db/schema, kebab string literal in arrays, and direct import paths.
 */
function findExternalReferences(kebab: string): string[] {
  const camel = kebab
    .split("-")
    .map((p, i) => (i === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
    .join("");

  const routerVar = camel + "Router";

  // Files we either delete outright or auto-unregister from — ignore those
  const ownFiles = new Set([
    path.join(REPO_ROOT, `packages/db/src/schema/${kebab}.ts`),
    path.join(REPO_ROOT, `packages/api/src/routers/${kebab}.ts`),
    path.join(REPO_ROOT, `apps/admin/app/pages/${kebab}/index.vue`),
    path.join(REPO_ROOT, `apps/admin/app/pages/${kebab}/create.vue`),
    path.join(REPO_ROOT, `apps/admin/app/pages/${kebab}/[id].vue`),
    path.join(REPO_ROOT, "packages/db/src/schema/index.ts"),
    path.join(REPO_ROOT, "packages/api/src/routers/index.ts"),
    path.join(REPO_ROOT, "apps/admin/app/composables/useNavigation.ts"),
  ]);

  const scanRoots = [
    path.join(REPO_ROOT, "packages/api/src"),
    path.join(REPO_ROOT, "packages/db/src"),
    path.join(REPO_ROOT, "apps/admin/app"),
    path.join(REPO_ROOT, "apps/web/app"),
  ];

  // Patterns that strongly suggest a dependency on this collection
  const wordBoundary = new RegExp(
    // drizzle query.<camel>, <routerVar>, or dotted .<camel>(
    `(?:\\bquery\\.${camel}\\b|\\b${routerVar}\\b|\\b${camel}\\.\\w)`,
  );
  const kebabLiteral = new RegExp(`["']${kebab}["']`);
  const importFromKebab = new RegExp(`from\\s+["'](?:\\./)?${kebab}(?:/[^"']*)?["']`);

  const refs: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".nuxt" || entry.name === "dist") continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(ts|vue)$/.test(entry.name)) continue;
      if (ownFiles.has(full)) continue;

      let content: string;
      try {
        content = fs.readFileSync(full, "utf-8");
      } catch {
        continue;
      }

      if (wordBoundary.test(content) || kebabLiteral.test(content) || importFromKebab.test(content)) {
        refs.push(path.relative(REPO_ROOT, full));
      }
    }
  }

  for (const root of scanRoots) walk(root);

  return refs.sort();
}

export const devCollectionsRouter = {
  list: devProcedure.handler(() => readCollectionsFromDisk()),

  create: devProcedure
    .input(collectionInfoSchema)
    .handler(async ({ input }) => {
      if (readCollectionsFromDisk().some((c) => c.kebab === input.kebab)) {
        throw new ORPCError("CONFLICT", {
          message: `Коллекция "${input.kebab}" уже существует`,
        });
      }

      const [
        { deriveNames, writeFile },
        { generateSchemaTemplate },
        { generateRouterTemplate },
        { generateListPageTemplate },
        { generateDetailPageTemplate },
        { generateCreatePageTemplate },
        { registerSchemaExport },
        { registerRouterImport },
        { registerNavItem },
      ] = await Promise.all([
        import("../../../../../scripts/generate-collection/utils.js"),
        import("../../../../../scripts/generate-collection/templates/schema.js"),
        import("../../../../../scripts/generate-collection/templates/router.js"),
        import("../../../../../scripts/generate-collection/templates/page-list.js"),
        import("../../../../../scripts/generate-collection/templates/page-detail.js"),
        import("../../../../../scripts/generate-collection/templates/page-create.js"),
        import("../../../../../scripts/generate-collection/registrations/schema-index.js"),
        import("../../../../../scripts/generate-collection/registrations/router-index.js"),
        import("../../../../../scripts/generate-collection/registrations/navigation.js"),
      ]);

      const names = deriveNames(input.kebab, input.labelRu, input.singularLabelRu);

      const files = [
        {
          path: path.join(REPO_ROOT, `packages/db/src/schema/${names.kebab}.ts`),
          content: generateSchemaTemplate(names, input.fields),
        },
        {
          path: path.join(REPO_ROOT, `packages/api/src/routers/${names.kebab}.ts`),
          content: generateRouterTemplate(names, input.fields),
        },
        {
          path: path.join(REPO_ROOT, `apps/admin/app/pages/${names.kebab}/index.vue`),
          content: generateListPageTemplate(names),
        },
        {
          path: path.join(REPO_ROOT, `apps/admin/app/pages/${names.kebab}/[id].vue`),
          content: generateDetailPageTemplate(names, input.fields),
        },
        {
          path: path.join(REPO_ROOT, `apps/admin/app/pages/${names.kebab}/create.vue`),
          content: generateCreatePageTemplate(names, input.fields),
        },
      ];

      for (const f of files) {
        writeFile(f.path, f.content);
      }

      registerSchemaExport(REPO_ROOT, names);
      registerRouterImport(REPO_ROOT, names);
      registerNavItem(REPO_ROOT, names, input.icon);

      let dbPushWarning: string | null = null;
      try {
        execSync("pnpm db:push --force", {
          cwd: REPO_ROOT,
          stdio: "pipe",
          timeout: 60_000,
        });
      } catch (err) {
        dbPushWarning =
          "Ошибка db:push. Запустите `pnpm db:push` вручную. " +
          String((err as { stderr?: Buffer })?.stderr ?? err).slice(0, 300);
      }

      return { kebab: input.kebab, ok: true, dbPushWarning };
    }),

  deleteCheck: devProcedure
    .input(z.object({ kebab: z.string().min(1) }))
    .handler(({ input }) => {
      return { kebab: input.kebab, references: findExternalReferences(input.kebab) };
    }),

  delete: devProcedure
    .input(z.object({ kebab: z.string().min(1), force: z.boolean().default(false) }))
    .handler(async ({ input }) => {
      const found = readCollectionsFromDisk().find((c) => c.kebab === input.kebab);
      if (!found) {
        throw new ORPCError("NOT_FOUND", {
          message: `Коллекция "${input.kebab}" не найдена`,
        });
      }

      const references = findExternalReferences(input.kebab);
      if (references.length > 0 && !input.force) {
        throw new ORPCError("CONFLICT", {
          message:
            `Коллекцию "${input.kebab}" нельзя удалить безопасно — на неё ссылаются ${references.length} файл(ов):\n` +
            references.map((r) => `  ${r}`).join("\n") +
            `\n\nПередайте force: true, чтобы удалить всё равно (после этого админка сломается до правок).`,
          data: { references },
        });
      }

      const { kebab } = input;
      const camel = kebab
        .split("-")
        .map((p, i) => (i === 0 ? p : p[0]!.toUpperCase() + p.slice(1)))
        .join("");
      const routerVar = camel + "Router";

      // Delete files and empty dir
      const pagesDir = path.join(PAGES_DIR, kebab);
      const filesToDelete = [
        path.join(REPO_ROOT, `packages/db/src/schema/${kebab}.ts`),
        path.join(REPO_ROOT, `packages/api/src/routers/${kebab}.ts`),
        path.join(pagesDir, "index.vue"),
        path.join(pagesDir, "create.vue"),
        path.join(pagesDir, "[id].vue"),
      ];
      for (const f of filesToDelete) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      if (fs.existsSync(pagesDir) && fs.readdirSync(pagesDir).length === 0) {
        fs.rmdirSync(pagesDir);
      }

      // Unregister from schema/index.ts
      const schemaIdx = path.join(REPO_ROOT, "packages/db/src/schema/index.ts");
      if (fs.existsSync(schemaIdx)) {
        let content = fs.readFileSync(schemaIdx, "utf-8");
        content = content.replace(new RegExp(`export \\* from "\\./${kebab}";\\n?`), "");
        fs.writeFileSync(schemaIdx, content, "utf-8");
      }

      // Unregister from routers/index.ts
      const routersIdx = path.join(REPO_ROOT, "packages/api/src/routers/index.ts");
      if (fs.existsSync(routersIdx)) {
        let content = fs.readFileSync(routersIdx, "utf-8");
        content = content.replace(
          new RegExp(`import \\{ ${routerVar} \\} from "\\./${kebab}";\\n?`),
          "",
        );
        content = content.replace(new RegExp(`  ${camel}: ${routerVar},\\n?`), "");
        fs.writeFileSync(routersIdx, content, "utf-8");
      }

      // Unregister from navigation
      if (fs.existsSync(NAV_FILE)) {
        let content = fs.readFileSync(NAV_FILE, "utf-8");
        const escaped = kebab.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        content = content.replace(
          new RegExp(
            `\\s*\\{[^}]*to:\\s*"/${escaped}"[^}]*\\},?`,
          ),
          "",
        );
        fs.writeFileSync(NAV_FILE, content, "utf-8");
      }

      return {
        kebab,
        ok: true,
        warning:
          "Файлы и регистрации удалены. Таблица в БД сохранена — дропните вручную через drop-миграцию.",
      };
    }),
};
