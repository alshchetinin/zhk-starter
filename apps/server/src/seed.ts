import { auth } from "@zhk/auth";
import { db } from "@zhk/db";
import * as schema from "@zhk/db/schema";
import { env } from "@zhk/env/server";
import { and, eq } from "drizzle-orm";

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

  const existingSite = await db
    .select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.id, "default"))
    .limit(1);

  if (existingSite.length === 0) {
    await db.insert(schema.sites).values({
      id: "default",
      slug: "main",
      name: "Главный сайт",
      isPrimary: true,
    });
    console.log("Default site created (id=default, slug=main, isPrimary=true)");
  } else {
    console.log("Default site already exists. Skipping.");
  }

  const defaultCategories = [
    { title: "Проекты", sortOrder: 0 },
    { title: "Способы покупки", sortOrder: 1 },
    { title: "Второстепенные", sortOrder: 2 },
  ];
  for (const cat of defaultCategories) {
    const exists = await db
      .select({ id: schema.pageCategories.id })
      .from(schema.pageCategories)
      .where(
        and(
          eq(schema.pageCategories.siteId, "default"),
          eq(schema.pageCategories.title, cat.title),
        ),
      )
      .limit(1);
    if (exists.length === 0) {
      await db.insert(schema.pageCategories).values({
        siteId: "default",
        title: cat.title,
        sortOrder: cat.sortOrder,
      });
      console.log(`Page category "${cat.title}" created`);
    }
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
