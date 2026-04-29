import { SOCIAL_LINK_TYPES, type SocialLinkType } from "@zhk/db/schema";

export { SOCIAL_LINK_TYPES };
export type { SocialLinkType };

export const SOCIAL_TYPE_LABELS: Record<SocialLinkType, string> = {
  vk: "VK",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  ok: "Одноклассники",
  youtube: "YouTube",
  dzen: "Дзен",
};

export const SOCIAL_TYPE_OPTIONS = SOCIAL_LINK_TYPES.map((value) => ({
  label: SOCIAL_TYPE_LABELS[value],
  value,
}));

export const SOCIAL_TYPE_ICONS: Record<SocialLinkType, string> = {
  vk: "lucide:at-sign",
  telegram: "lucide:send",
  whatsapp: "lucide:message-circle",
  ok: "lucide:circle-dot",
  youtube: "lucide:youtube",
  dzen: "lucide:flame",
};

export const MESSENGER_SOCIAL_TYPES: ReadonlySet<SocialLinkType> = new Set(["telegram", "whatsapp"]);

export function isMessengerSocial(type: SocialLinkType): boolean {
  return MESSENGER_SOCIAL_TYPES.has(type);
}
