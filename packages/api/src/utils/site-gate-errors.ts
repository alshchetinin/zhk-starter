export const SITE_GATE_ERROR = {
  INACTIVE: "SITE_INACTIVE",
  LOCKED: "SITE_LOCKED",
  WRONG_PASSWORD: "WRONG_PASSWORD",
} as const;

export type SiteGateError = (typeof SITE_GATE_ERROR)[keyof typeof SITE_GATE_ERROR];
