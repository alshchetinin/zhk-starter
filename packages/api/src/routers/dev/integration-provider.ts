import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@zhk/db";
import { integrations } from "@zhk/db/schema";
import { devProcedure, publicProcedure } from "../../index";

const PROVIDER = z.enum(["macro", "profitbase"]);
type Provider = z.infer<typeof PROVIDER>;

const ENV_FILES = [
  resolve(process.cwd(), "../../apps/server/.env"),
  resolve(process.cwd(), "apps/server/.env"),
];

async function findEnvFile(): Promise<string> {
  for (const candidate of ENV_FILES) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // try next
    }
  }
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "apps/server/.env not found",
  });
}

async function updateEnvVar(key: string, value: string) {
  const path = await findEnvFile();
  const content = await readFile(path, "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  const next = re.test(content)
    ? content.replace(re, line)
    : content.trimEnd() + `\n${line}\n`;
  await writeFile(path, next, "utf8");
}

export const devIntegrationProviderRouter = {
  get: publicProcedure.handler(() => {
    return {
      provider: (process.env.INTEGRATION_PROVIDER ?? "macro") as Provider,
    };
  }),

  set: devProcedure
    .input(z.object({ provider: PROVIDER, force: z.boolean().default(false) }))
    .handler(async ({ input }) => {
      const existing = await db.query.integrations.findFirst();
      if (existing && existing.type && existing.type !== input.provider) {
        if (!input.force) {
          throw new ORPCError("CONFLICT", {
            message:
              "Уже настроена интеграция другого типа. Передайте force=true чтобы её сбросить.",
          });
        }
        await db
          .update(integrations)
          .set({
            type: null,
            isActive: false,
            autoSyncEnabled: false,
            domain: null,
            apiDomain: null,
            appSecret: null,
            macroType: null,
          })
          .where(eq(integrations.id, existing.id));
      }

      await updateEnvVar("INTEGRATION_PROVIDER", input.provider);
      process.env.INTEGRATION_PROVIDER = input.provider;

      return { provider: input.provider, restartRequired: true };
    }),
};
