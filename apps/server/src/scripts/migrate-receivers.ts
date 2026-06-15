import { db } from "@zhk/db";
import { formReceivers, modals, sites } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Одноразовый идемпотентный backfill: глобальный telegram-конфиг ticket_settings
 * → form_receivers (type=telegram) на primary-сайте + проставить его в receiverIds
 * существующих модалок этого сайта.
 *
 * Использует raw SQL для чтения ticket_settings, чтобы скрипт компилировался
 * после удаления этой таблицы из схемы (таблица к тому моменту уже дропнута).
 */
async function migrate() {
  // Проверяем, существует ли таблица ticket_settings.
  const tableCheck = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'ticket_settings'
    ) AS exists
  `);
  const tableExists = tableCheck.rows[0]?.exists;
  if (!tableExists) {
    console.log("Таблица ticket_settings не существует — миграция уже выполнена или не нужна.");
    process.exit(0);
  }

  const rows = await db.execute<{ telegram_bot_token: string | null; telegram_chat_id: string | null; site_id: string }>(
    sql`SELECT telegram_bot_token, telegram_chat_id, site_id FROM ticket_settings LIMIT 1`
  );
  const settings = rows.rows[0];

  if (!settings?.telegram_bot_token || !settings.telegram_chat_id) {
    console.log("Нет telegram-конфига в ticket_settings — нечего мигрировать.");
    process.exit(0);
  }

  const primary = await db.query.sites.findFirst({ where: eq(sites.isPrimary, true) });
  const siteId = primary?.id ?? settings.site_id;

  // Идемпотентность: не дублируем, если уже есть telegram-приёмщик с этим chatId.
  const existing = await db.query.formReceivers.findMany({
    where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.type, "telegram")),
  });
  const already = existing.find(
    (r) => (r.config as { chatId?: string }).chatId === settings.telegram_chat_id,
  );

  let receiverId: string;
  if (already) {
    receiverId = already.id;
    console.log(`Telegram-приёмщик уже существует: ${receiverId}`);
  } else {
    const [created] = await db
      .insert(formReceivers)
      .values({
        siteId,
        type: "telegram",
        name: "Telegram",
        config: { botToken: settings.telegram_bot_token, chatId: settings.telegram_chat_id },
        enabled: true,
      })
      .returning({ id: formReceivers.id });
    receiverId = created!.id;
    console.log(`Создан telegram-приёмщик: ${receiverId}`);
  }

  // Проставить приёмщик в модалки сайта, где его ещё нет.
  const siteModals = await db.query.modals.findMany({ where: eq(modals.siteId, siteId) });
  for (const m of siteModals) {
    const ids = (m.receiverIds as string[]) ?? [];
    if (!ids.includes(receiverId)) {
      await db
        .update(modals)
        .set({ receiverIds: [...ids, receiverId] })
        .where(eq(modals.id, m.id));
    }
  }
  console.log(`Обновлено модалок: ${siteModals.length}`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
