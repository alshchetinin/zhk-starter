/**
 * Какие приёмщики срабатывают для submission.
 * - форма найдена → её receiverIds ∩ enabled (порядок enabled);
 * - форма не найдена (программная заявка) → все enabled (бэк-компат с «Telegram на всё»).
 */
export function resolveReceiverIds(
  form: { receiverIds: string[] } | null,
  enabledReceivers: Array<{ id: string }>,
): string[] {
  const enabledIds = enabledReceivers.map((r) => r.id);
  if (!form) return enabledIds;
  const set = new Set(form.receiverIds);
  return enabledIds.filter((id) => set.has(id));
}
