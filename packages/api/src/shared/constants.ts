export const SITE_COOKIE = "zhk-site-id";
export const IMPERSONATE_COOKIE = "zhk-impersonate-user";

export const PERMISSION_ACTIONS = ["view", "edit", "publish"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ENTITY_TYPES = [
  "pages",
  "news",
  "documents",
  "promotions",
  "homepage",
  "contacts",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const PREVIEW_MESSAGE = {
  Update: "preview:update",
  Ready: "preview:ready",
  ScrollTo: "preview:scroll-to",
  GetScroll: "preview:get-scroll",
  ScrollPosition: "preview:scroll-position",
  RestoreScroll: "preview:restore-scroll",
  EditBlock: "preview:edit-block",
  InsertBelow: "preview:insert-below",
  RemoveBlock: "preview:remove-block",
} as const;
export type PreviewMessageType = (typeof PREVIEW_MESSAGE)[keyof typeof PREVIEW_MESSAGE];
