import type { SiteAnalyticsSettings } from "@zhk/api/shared/tracking";
import type { PublicSiteSeo } from "@zhk/api/shared/seo";
import type { SiteBreadcrumbsSettings } from "@zhk/api/shared/breadcrumbs";

type SiteStatus = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "inactive" | "locked";
  requiresPassword: boolean;
  analytics: SiteAnalyticsSettings | null;
  seo: PublicSiteSeo;
  breadcrumbs: SiteBreadcrumbsSettings | null;
};

export function useSiteGate() {
  return useState<SiteStatus | null>("siteGate", () => null);
}
