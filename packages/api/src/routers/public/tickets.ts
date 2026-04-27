import { z } from "zod";
import { db } from "@zhk/db";
import { tickets, ticketTypeEnum } from "@zhk/db/schema";
import { publicActiveSiteProcedure } from "../../index";

async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  ticket: {
    name?: string | null;
    phone: string;
    email?: string | null;
    message?: string | null;
    type: string;
    source?: string | null;
    url?: string | null;
  },
) {
  const typeLabels: Record<string, string> = {
    lead: "Заявка",
    callback: "Обратный звонок",
    question: "Вопрос",
  };

  const lines = [
    `📩 <b>${typeLabels[ticket.type] ?? ticket.type}</b>`,
    "",
    `📞 <b>${ticket.phone}</b>`,
  ];
  if (ticket.name) lines.push(`👤 ${ticket.name}`);
  if (ticket.email) lines.push(`✉️ ${ticket.email}`);
  if (ticket.message) lines.push(`💬 ${ticket.message}`);
  if (ticket.source) lines.push(`📍 Источник: ${ticket.source}`);
  if (ticket.url) lines.push(`🔗 ${ticket.url}`);

  const text = lines.join("\n");

  try {
    await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      },
    );
  } catch (err) {
    console.error("[telegram] Failed to send notification:", err);
  }
}

export const publicTicketsRouter = {
  create: publicActiveSiteProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().min(1),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        message: z.string().optional(),
        type: z.enum(ticketTypeEnum.enumValues).default("lead"),
        source: z.string().optional(),
        url: z.string().optional(),
        utm: z.record(z.string(), z.string()).optional(),
        apartmentId: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created, settings] = await Promise.all([
        db
          .insert(tickets)
          .values({
            name: input.name ?? null,
            phone: input.phone,
            email: input.email || null,
            message: input.message ?? null,
            type: input.type,
            source: input.source ?? null,
            url: input.url ?? null,
            utm: input.utm ?? null,
            apartmentId: input.apartmentId ?? null,
          })
          .returning()
          .then((r) => r[0]!),
        db.query.ticketSettings.findFirst(),
      ]);

      // Send Telegram notification (non-blocking)
      if (settings?.telegramBotToken && settings.telegramChatId) {
        sendTelegramNotification(
          settings.telegramBotToken,
          settings.telegramChatId,
          created,
        );
      }

      return { success: true, id: created!.id };
    }),
};
