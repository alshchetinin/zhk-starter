import { auth } from "@zhk/auth";
import { db } from "@zhk/db";
import * as schema from "@zhk/db/schema";
import { env } from "@zhk/env/server";
import { eq } from "drizzle-orm";

async function seed() {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  const name = env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error(
      "Missing required environment variables: ADMIN_EMAIL, ADMIN_PASSWORD",
    );
    process.exit(1);
  }

  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin user "${email}" already exists. Skipping.`);
    process.exit(0);
  }

  const result = await auth.api.createUser({
    body: { email, password, name, role: "admin" },
  });

  if (!result) {
    console.error("Failed to create admin user.");
    process.exit(1);
  }

  const user = result.user ?? result;
  console.log(`Admin user created: ${user.email} (id: ${user.id})`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
