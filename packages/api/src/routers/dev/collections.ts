import { ORPCError } from "@orpc/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { devProcedure } from "../../index";
import { REPO_ROOT } from "../../utils/paths";
import { toCamelCase } from "../../utils/naming";

const PAGES_DIR = path.join(REPO_ROOT, "apps/admin/app/pages");
const NAV_FILE = path.join(REPO_ROOT, "apps/admin/app/composables/useNavigation.ts");
const SCHEMA_INDEX = path.join(REPO_ROOT, "packages/db/src/schema/index.ts");
const ROUTERS_INDEX = path.join(REPO_ROOT, "packages/api/src/routers/index.ts");

const SCAN_ROOTS = [
  path.join(REPO_ROOT, "packages/api/src"),
  path.join(REPO_ROOT, "packages/db/src"),
  path.join(REPO_ROOT, "apps/admin/app"),
  path.join(REPO_ROOT, "apps/web/app"),
];

const EXCLUDED_DIR_NAMES = new Set(["node_modules", ".nuxt", "dist"]);

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

type Section = "content" | "catalog" | "system";

interface DiskCollection {
  kebab: string;
  label: string | null;
  icon: string | null;
  section: Section | null;
}

function kebabToSection(navContent: string, entryMatch: string): Section | null {
  for (const [arr, section] of [
    ["contentItems", "content" as const],
    ["catalogItems", "catalog" as const],
    ["systemItems", "system" as const],
  ] as const) {
    const start = navContent.indexOf(`const ${arr}`);
    if (start === -1) continue;
    const end = navContent.indexOf("];", start);
    if (end === -1) continue;
    const idx = navContent.indexOf(entryMatch, start);
    if (idx !== -1 && idx < end) return section;
  }
  return null;
}

function readCollectionsFromDisk(): DiskCollection[] {
  if (!fs.existsSync(PAGES_DIR)) return [];

  const navContent = fs.existsSync(NAV_FILE) ? fs.readFileSync(NAV_FILE, "utf-8") : "";

  const dirs = fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "dev")
    .map((d) => d.name);

  const collections: DiskCollection[] = [];
  for (const dir of dirs) {
    const dirPath = path.join(PAGES_DIR, dir);
    if (
      !fs.existsSync(path.join(dirPath, "index.vue")) ||
      !fs.existsSync(path.join(dirPath, "create.vue")) ||
      !fs.existsSync(path.join(dirPath, "[id].vue"))
    ) {
      continue;
    }

    const escaped = dir.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const entryRe = new RegExp(
      `\\{[^}]*label:\\s*"([^"]+)"[^}]*icon:\\s*"([^"]+)"[^}]*to:\\s*"/${escaped}"[^}]*\\}`,
    );
    const match = navContent.match(entryRe);

    collections.push({
      kebab: dir,
      label: match?.[1] ?? null,
      icon: match?.[2] ?? null,
      section: match ? kebabToSection(navContent, match[0]!) : null,
    });
  }

  return collections.sort((a, b) => a.kebab.localeCompare(b.kebab));
}

/** One-shot walk that builds a map of all scannable files → file content. */
function loadScannableFiles(ownFiles: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();

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
        if (!EXCLUDED_DIR_NAMES.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(ts|vue)$/.test(entry.name)) continue;
      if (ownFiles.has(full)) continue;
      try {
        out.set(full, fs.readFileSync(full, "utf-8"));
      } catch {
        /* skip */
      }
    }
  }

  for (const root of SCAN_ROOTS) walk(root);
  return out;
}

function ownFilesFor(kebab: string): Set<string> {
  return new Set([
    path.join(REPO_ROOT, `packages/db/src/schema/${kebab}.ts`),
    path.join(REPO_ROOT, `packages/api/src/routers/${kebab}.ts`),
    path.join(PAGES_DIR, kebab, "index.vue"),
    path.join(PAGES_DIR, kebab, "create.vue"),
    path.join(PAGES_DIR, kebab, "[id].vue"),
    SCHEMA_INDEX,
    ROUTERS_INDEX,
    NAV_FILE,
  ]);
}

function buildReferenceRegex(kebab: string): RegExp {
  const camel = toCamelCase(kebab);
  const routerVar = `${camel}Router`;
  // drizzle query.<camel>, routerVar, <camel>.<anything>, string literal, import path
  return new RegExp(
    `(?:\\bquery\\.${camel}\\b|\\b${routerVar}\\b|\\b${camel}\\.\\w|["']${kebab}["']|from\\s+["'](?:\\./)?${kebab}(?:/[^"']*)?["'])`,
  );
}

function findReferencesIn(files: Map<string, string>, kebab: string): string[] {
  const re = buildReferenceRegex(kebab);
  const refs: string[] = [];
  for (const [full, content] of files) {
    if (re.test(content)) refs.push(path.relative(REPO_ROOT, full));
  }
  return refs.sort();
}

function findExternalReferences(kebab: string): string[] {
  return findReferencesIn(loadScannableFiles(ownFilesFor(kebab)), kebab);
}

function safeUnlink(file: string) {
  try {
    fs.unlinkSync(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export const devCollectionsRouter = {
  list: devProcedure.handler(() => {
    const collections = readCollectionsFromDisk();
    // Own-files set is per-collection, but shared dirs/excludes are the same.
    // Load once with a minimal excludes set, then check each collection against cached content.
    const sharedExcluded = new Set([SCHEMA_INDEX, ROUTERS_INDEX, NAV_FILE]);
    const files = loadScannableFiles(sharedExcluded);

    return collections.map((c) => {
      // Drop this collection's own files from the match (they'd self-match)
      const own = ownFilesFor(c.kebab);
      const re = buildReferenceRegex(c.kebab);
      let count = 0;
      for (const [full, content] of files) {
        if (own.has(full)) continue;
        if (re.test(content)) count++;
      }
      return { ...c, referenceCount: count };
    });
  }),

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
          path: path.join(PAGES_DIR, `${names.kebab}/index.vue`),
          content: generateListPageTemplate(names),
        },
        {
          path: path.join(PAGES_DIR, `${names.kebab}/[id].vue`),
          content: generateDetailPageTemplate(names, input.fields),
        },
        {
          path: path.join(PAGES_DIR, `${names.kebab}/create.vue`),
          content: generateCreatePageTemplate(names, input.fields),
        },
      ];
      for (const f of files) writeFile(f.path, f.content);

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
    .input(z.object({ kebab: z.string().min(1) }))
    .handler(async ({ input }) => {
      const { kebab } = input;
      if (!readCollectionsFromDisk().some((c) => c.kebab === kebab)) {
        throw new ORPCError("NOT_FOUND", { message: `Коллекция "${kebab}" не найдена` });
      }

      const references = findExternalReferences(kebab);
      if (references.length > 0) {
        throw new ORPCError("CONFLICT", {
          message:
            `Коллекцию "${kebab}" нельзя удалить — на неё ссылаются ${references.length} файл(ов). ` +
            `Сначала уберите ссылки в:\n${references.map((r) => `  ${r}`).join("\n")}`,
          data: { references },
        });
      }

      const camel = toCamelCase(kebab);
      const routerVar = `${camel}Router`;
      const pagesDir = path.join(PAGES_DIR, kebab);

      for (const f of [
        path.join(REPO_ROOT, `packages/db/src/schema/${kebab}.ts`),
        path.join(REPO_ROOT, `packages/api/src/routers/${kebab}.ts`),
        path.join(pagesDir, "index.vue"),
        path.join(pagesDir, "create.vue"),
        path.join(pagesDir, "[id].vue"),
      ]) {
        safeUnlink(f);
      }
      try {
        if (fs.readdirSync(pagesDir).length === 0) fs.rmdirSync(pagesDir);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }

      function rewrite(file: string, mutate: (s: string) => string) {
        try {
          fs.writeFileSync(file, mutate(fs.readFileSync(file, "utf-8")), "utf-8");
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        }
      }

      rewrite(SCHEMA_INDEX, (s) => s.replace(new RegExp(`export \\* from "\\./${kebab}";\\n?`), ""));
      rewrite(ROUTERS_INDEX, (s) =>
        s
          .replace(new RegExp(`import \\{ ${routerVar} \\} from "\\./${kebab}";\\n?`), "")
          .replace(new RegExp(`  ${camel}: ${routerVar},\\n?`), ""),
      );
      const escaped = kebab.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      rewrite(NAV_FILE, (s) =>
        s.replace(new RegExp(`\\s*\\{[^}]*to:\\s*"/${escaped}"[^}]*\\},?`), ""),
      );

      return {
        kebab,
        ok: true,
        warning:
          "Файлы и регистрации удалены. Таблица в БД сохранена — дропните вручную через drop-миграцию.",
      };
    }),
};
