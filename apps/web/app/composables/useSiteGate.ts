type SiteStatus = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "inactive" | "locked";
  requiresPassword: boolean;
};

export function useSiteGate() {
  return useState<SiteStatus | null>("siteGate", () => null);
}
