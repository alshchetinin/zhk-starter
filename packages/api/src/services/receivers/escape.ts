/** Экранирует HTML-метасимволы (&, <, >) для безопасной интерполяции в HTML/Telegram-разметку. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
