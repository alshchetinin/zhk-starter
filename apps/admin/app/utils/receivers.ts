import { receiverDefinitions } from "@zhk/api/shared/receivers";

export const receiverTypeLabels: Record<string, string> = Object.fromEntries(
  receiverDefinitions.map((r) => [r.type, r.label]),
);
export const receiverTypeIcons: Record<string, string> = Object.fromEntries(
  receiverDefinitions.map((r) => [r.type, r.icon]),
);

export const deliveryStatusLabels: Record<string, string> = {
  pending: "В очереди",
  ok: "Доставлено",
  error: "Ошибка",
};
export const deliveryStatusColors: Record<string, "neutral" | "success" | "error"> = {
  pending: "neutral",
  ok: "success",
  error: "error",
};
