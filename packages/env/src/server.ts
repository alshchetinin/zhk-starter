import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .min(1)
      .transform((val) => val.split(",").map((s) => s.trim())),
    COOKIE_DOMAIN: z.string().optional(),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    ADMIN_NAME: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    GLITCHTIP_DSN: z.string().optional(),
    RL_AUTH_SIGNIN_POINTS: z.coerce.number().int().positive().optional(),
    RL_AUTH_SIGNIN_DURATION: z.coerce.number().int().positive().optional(),
    RL_SITE_UNLOCK_POINTS: z.coerce.number().int().positive().optional(),
    RL_SITE_UNLOCK_DURATION: z.coerce.number().int().positive().optional(),
    RL_TICKET_CREATE_POINTS: z.coerce.number().int().positive().optional(),
    RL_TICKET_CREATE_DURATION: z.coerce.number().int().positive().optional(),
    RL_TICKET_HOURLY_POINTS: z.coerce.number().int().positive().optional(),
    RL_CONTACTS_GETBYIDS_POINTS: z.coerce.number().int().positive().optional(),
    RL_PUBLIC_READ_POINTS: z.coerce.number().int().positive().optional(),
    RL_HONO_CEILING_POINTS: z.coerce.number().int().positive().optional(),
    RL_ENABLED: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_ACCESS_SECRET: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ENDPOINT: z.string().url(),
    S3_BASE_URL: z.string().url(),
    S3_REGION: z.string().min(1),
    INTEGRATION_PROVIDER: z
      .enum(["macro", "profitbase"])
      .default("macro"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
