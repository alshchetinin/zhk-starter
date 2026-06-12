import type { SiteAnalyticsSettings } from "@zhk/api/shared/tracking";
import type { PublicSiteSeo } from "@zhk/api/shared/seo";

type SiteStatus = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "inactive" | "locked";
  requiresPassword: boolean;
  analytics: SiteAnalyticsSettings | null;
  seo: PublicSiteSeo | null;
};

export function useSiteGate() {
  return useState<SiteStatus | null>("siteGate", () => null);
}
