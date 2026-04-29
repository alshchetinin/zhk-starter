import type { SiteAnalyticsSettings } from "@zhk/api/shared/tracking";

type SiteStatus = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "inactive" | "locked";
  requiresPassword: boolean;
  analytics: SiteAnalyticsSettings | null;
};

export function useSiteGate() {
  return useState<SiteStatus | null>("siteGate", () => null);
}
