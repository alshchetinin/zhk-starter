export interface NavItem {
  label: string;
  icon: string;
  to: string;
  section?: string;
  adminOnly?: boolean;
}

const mainItems: NavItem[] = [
  { label: "Dashboard", icon: "i-tabler-layout-dashboard", to: "/" },
];

const realtyItems: NavItem[] = [
  { label: "Projects", icon: "i-tabler-building", to: "/projects", section: "projects" },
  { label: "Buildings", icon: "i-tabler-building-skyscraper", to: "/buildings", section: "buildings" },
  { label: "Apartments", icon: "i-tabler-home", to: "/apartments", section: "apartments" },
  { label: "Commerce", icon: "i-tabler-shopping-cart", to: "/commerce", section: "commerce" },
  { label: "Layouts", icon: "i-tabler-layout", to: "/layouts", section: "layouts" },
];

const contentItems: NavItem[] = [
  { label: "Главная", icon: "i-tabler-home-2", to: "/homepage", section: "homepage" },
  { label: "Новости", icon: "i-tabler-news", to: "/news", section: "news" },
  { label: "Страницы", icon: "i-tabler-file-text", to: "/pages", section: "pages" },
  { label: "Акции", icon: "i-tabler-discount-2", to: "/promotions", section: "promotions" },
  { label: "Документы", icon: "i-tabler-file-certificate", to: "/documents", section: "documents" },
];

const systemItems: NavItem[] = [
  { label: "Заявки", icon: "i-tabler-inbox", to: "/tickets", section: "tickets" },
  { label: "Контакты", icon: "i-tabler-address-book", to: "/contacts", section: "contacts" },
  { label: "Сайты", icon: "i-tabler-building-store", to: "/sites", adminOnly: true },
  { label: "Пользователи", icon: "i-tabler-users", to: "/users", adminOnly: true },
  { label: "Integrations", icon: "i-tabler-plug", to: "/integrations", adminOnly: true },
];

const allGroups: NavItem[][] = [mainItems, realtyItems, contentItems, systemItems];

export function useNavigation() {
  const route = useRoute();
  const { $authClient } = useNuxtApp();
  const toast = useToast();
  const { isAdmin, canAccessSection } = useCurrentUser();

  const navGroups = computed<NavItem[][]>(() => {
    return allGroups
      .map((group) =>
        group.filter((item) => {
          if (item.adminOnly) return isAdmin.value;
          if (item.section) return canAccessSection(item.section);
          return true;
        }),
      )
      .filter((group) => group.length > 0);
  });

  function isActive(to: string) {
    if (to === "/") return route.path === "/";
    return route.path.startsWith(to);
  }

  async function handleSignOut() {
    try {
      await $authClient.signOut();
      toast.add({ title: "Signed out", color: "success" });
      window.location.href = "/";
    } catch {
      toast.add({ title: "Error signing out", color: "error" });
    }
  }

  return { navGroups, isActive, handleSignOut };
}
