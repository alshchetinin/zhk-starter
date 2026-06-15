import { db } from "@zhk/db";
import { formReceivers, modals, ticketSettings, sites } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Одноразовый идемпотентный backfill: глобальный telegram-конфиг ticket_settings
 * → form_receivers (type=telegram) на primary-сайте + проставить его в receiverIds
 * существующих модалок этого сайта.
 */
async function migrate() {
  const settings = await db.query.ticketSettings.findFirst();
  if (!settings?.telegramBotToken || !settings.telegramChatId) {
    console.log("Нет telegram-конфига в ticket_settings — нечего мигрировать.");
    process.exit(0);
  }

  const primary = await db.query.sites.findFirst({ where: eq(sites.isPrimary, true) });
  const siteId = primary?.id ?? settings.siteId;

  // Идемпотентность: не дублируем, если уже есть telegram-приёмщик с этим chatId.
  const existing = await db.query.formReceivers.findMany({
    where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.type, "telegram")),
  });
  const already = existing.find(
    (r) => (r.config as { chatId?: string }).chatId === settings.telegramChatId,
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
        config: { botToken: settings.telegramBotToken, chatId: settings.telegramChatId },
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
