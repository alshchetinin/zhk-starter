export interface NavItem {
  label: string;
  icon: string;
  to: string;
}

const mainItems: NavItem[] = [
  { label: "Dashboard", icon: "i-tabler-layout-dashboard", to: "/" },
];

const realtyItems: NavItem[] = [
  { label: "Projects", icon: "i-tabler-building", to: "/projects" },
  { label: "Buildings", icon: "i-tabler-building-skyscraper", to: "/buildings" },
  { label: "Apartments", icon: "i-tabler-home", to: "/apartments" },
  { label: "Commerce", icon: "i-tabler-shopping-cart", to: "/commerce" },
  { label: "Layouts", icon: "i-tabler-layout", to: "/layouts" },
];

const contentItems: NavItem[] = [
  { label: "Главная", icon: "i-tabler-home-2", to: "/homepage" },
  { label: "Новости", icon: "i-tabler-news", to: "/news" },
  { label: "Страницы", icon: "i-tabler-file-text", to: "/pages" },
  { label: "Акции", icon: "i-tabler-discount-2", to: "/promotions" },
  { label: "Документы", icon: "i-tabler-file-certificate", to: "/documents" },
];

const systemItems: NavItem[] = [
  { label: "Заявки", icon: "i-tabler-inbox", to: "/tickets" },
  { label: "Контакты", icon: "i-tabler-address-book", to: "/contacts" },
  { label: "Integrations", icon: "i-tabler-plug", to: "/integrations" },
];

export const navGroups: NavItem[][] = [mainItems, realtyItems, contentItems, systemItems];

export function useNavigation() {
  const route = useRoute();
  const { $authClient } = useNuxtApp();
  const toast = useToast();

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
