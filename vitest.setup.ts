/**
 * Глобальный setup для vitest. Заполняет минимально необходимые env-переменные
 * фиктивными значениями, чтобы модули, импортирующие `@zhk/env/server`
 * (валидируется eagerly через @t3-oss/env-core при импорте), не падали в тестах.
 *
 * Значения — заглушки; реальные секреты в тестах не используются. Перекрываем
 * только отсутствующие ключи (defaults применяются как для prod).
 */
const TEST_ENV: Record<string, string> = {
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  BETTER_AUTH_SECRET: "test-secret-0000000000000000000000000000",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGINS: "http://localhost:3001",
  S3_ACCESS_KEY_ID: "test",
  S3_ACCESS_SECRET: "test",
  S3_BUCKET: "test",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BASE_URL: "http://localhost:9000/test",
  S3_REGION: "us-east-1",
  NODE_ENV: "test",
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (!process.env[key]) process.env[key] = value;
}
