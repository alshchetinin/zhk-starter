import path from "node:path";
import { fileURLToPath } from "node:url";

// This file lives at packages/api/src/utils/paths.ts — 4 dirs up to repo root.
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
