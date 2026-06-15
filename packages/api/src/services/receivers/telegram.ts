import type { Deliverer, DeliveryContext } from "../../shared/receivers";
import type { TelegramConfig } from "../../shared/receivers";
import { escapeHtml } from "./escape";

const TYPE_LABELS: Record<string, string> = {
  lead: "Заявка",
  callback: "Обратный звонок",
  question: "Вопрос",
  booking: "Бронирование",
};

export function formatTelegramMessage(ctx: DeliveryContext): string {
  const lines = [
    `📩 <b>${TYPE_LABELS[ctx.ticket.type] ?? escapeHtml(ctx.ticket.type)}</b> — ${escapeHtml(ctx.site.name)}`,
    "",
  ];
  for (const f of ctx.fields) {
    lines.push(`${escapeHtml(f.label)}: <b>${escapeHtml(f.value)}</b>`);
  }
  if (ctx.ticket.source) lines.push(`📍 Источник: ${escapeHtml(ctx.ticket.source)}`);
  if (ctx.ticket.url) lines.push(`🔗 ${escapeHtml(ctx.ticket.url)}`);
  return lines.join("\n");
}

export const deliverTelegram: Deliverer<TelegramConfig> = async (ctx, config) => {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: formatTelegramMessage(ctx),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${text}`.trim() };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
