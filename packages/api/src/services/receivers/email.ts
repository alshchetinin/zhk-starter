import type { Deliverer, DeliveryContext } from "../../shared/receivers";
import type { EmailConfig } from "../../shared/receivers";
import { getMailer, getFrom } from "./smtp";
import { escapeHtml } from "./escape";

const TYPE_LABELS: Record<string, string> = {
  lead: "Заявка",
  callback: "Обратный звонок",
  question: "Вопрос",
  booking: "Бронирование",
};

function renderText(ctx: DeliveryContext): string {
  const lines = [
    `${TYPE_LABELS[ctx.ticket.type] ?? ctx.ticket.type} — ${ctx.site.name}`,
    "",
    ...ctx.fields.map((f) => `${f.label}: ${f.value}`),
  ];
  if (ctx.ticket.source) lines.push(`Источник: ${ctx.ticket.source}`);
  if (ctx.ticket.url) lines.push(`Страница: ${ctx.ticket.url}`);
  return lines.join("\n");
}

function renderHtml(ctx: DeliveryContext): string {
  const rows = ctx.fields
    .map((f) => `<tr><td style="padding:4px 8px;color:#666">${escapeHtml(f.label)}</td><td style="padding:4px 8px"><b>${escapeHtml(f.value)}</b></td></tr>`)
    .join("");
  return `<h2>${TYPE_LABELS[ctx.ticket.type] ?? escapeHtml(ctx.ticket.type)} — ${escapeHtml(ctx.site.name)}</h2><table>${rows}</table>` +
    (ctx.ticket.source ? `<p>Источник: ${escapeHtml(ctx.ticket.source)}</p>` : "") +
    (ctx.ticket.url ? `<p>Страница: <a href="${escapeHtml(ctx.ticket.url)}">${escapeHtml(ctx.ticket.url)}</a></p>` : "");
}

export const deliverEmail: Deliverer<EmailConfig> = async (ctx, config) => {
  const mailer = getMailer();
  if (!mailer) return { ok: false, error: "SMTP не настроен (нет SMTP_HOST/SMTP_PORT)" };
  try {
    await mailer.sendMail({
      from: getFrom(),
      to: config.to,
      subject: config.subject || `${TYPE_LABELS[ctx.ticket.type] ?? "Заявка"} — ${ctx.site.name}`,
      text: renderText(ctx),
      html: renderHtml(ctx),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
