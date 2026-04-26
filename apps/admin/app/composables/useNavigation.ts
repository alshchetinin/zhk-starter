export interface NavItem {
  label: string;
  icon: string;
  to: string;
  section?: string;
  adminOnly?: boolean;
}

const mainItems: NavItem[] = [
  { label: "Дашборд", icon: "i-tabler-layout-dashboard", to: "/" },
];

// Per-site content — changes when site switcher is changed
const contentItems: NavItem[] = [
  { label: "Главная", icon: "i-tabler-home-2", to: "/homepage", section: "homepage" },
  { label: "Новости", icon: "i-tabler-news", to: "/news", section: "news" },
  { label: "Страницы", icon: "i-tabler-file-text", to: "/pages", section: "pages" },
  { label: "Акции", icon: "i-tabler-discount-2", to: "/promotions", section: "promotions" },
  { label: "Документы", icon: "i-tabler-file-certificate", to: "/documents", section: "documents" },
  { label: "Модальные окна", icon: "i-tabler-app-window", to: "/modals", section: "modals" },
];

// Shared across all sites
const catalogItems: NavItem[] = [
  { label: "Проекты", icon: "i-tabler-building", to: "/projects", section: "projects" },
  { label: "Дома", icon: "i-tabler-building-skyscraper", to: "/buildings", section: "buildings" },
  { label: "Квартиры", icon: "i-tabler-home", to: "/apartments", section: "apartments" },
  { label: "Коммерция", icon: "i-tabler-shopping-cart", to: "/commerce", section: "commerce" },
  { label: "Паркинги", icon: "i-tabler-parking", to: "/parking", section: "parking" },
  { label: "Кладовки", icon: "i-tabler-box", to: "/storage", section: "storage" },
  { label: "Планировки", icon: "i-tabler-layout", to: "/layouts", section: "layouts" },
  { label: "Теги", icon: "i-tabler-tags", to: "/tags", section: "tags" },
  { label: "Ипотека", icon: "i-tabler-coin", to: "/mortgage", section: "mortgage" },
  { label: "Способы покупки", icon: "i-tabler-credit-card", to: "/purchase-methods", section: "purchase-methods" },
  { label: "Заявки", icon: "i-tabler-inbox", to: "/tickets", section: "tickets" },
];

// Company-wide brand info
const companyItems: NavItem[] = [
  { label: "Медиа", icon: "i-tabler-photo", to: "/media" },
  { label: "Контакты", icon: "i-tabler-address-book", to: "/contacts", section: "contacts" },
  { label: "Соцсети", icon: "i-tabler-brand-telegram", to: "/socials", adminOnly: true },
];

// Admin-only system config
const systemItems: NavItem[] = [
  { label: "Сайты", icon: "i-tabler-building-store", to: "/sites", adminOnly: true },
  { label: "Пользователи", icon: "i-tabler-users", to: "/users", adminOnly: true },
  { label: "Интеграции", icon: "i-tabler-plug", to: "/integrations", adminOnly: true },
];

// Dev-only tools (content-type builder). Hidden in production.
const devItems: NavItem[] = import.meta.dev
  ? [
      { label: "Блоки", icon: "i-tabler-puzzle", to: "/dev/blocks", adminOnly: true },
      { label: "Коллекции", icon: "i-tabler-stack-2", to: "/dev/collections", adminOnly: true },
      { label: "Документация", icon: "i-tabler-book", to: "/dev/docs", adminOnly: true },
      { label: "Интеграция", icon: "i-tabler-plug", to: "/dev/integration-provider", adminOnly: true },
    ]
  : [];

const allGroups: NavItem[][] = [mainItems, contentItems, catalogItems, companyItems, systemItems, devItems];

export { contentItems, catalogItems, companyItems, mainItems, systemItems, devItems };

export const permissionSections: Array<{ id: string; label: string }> = [
  ...contentItems,
  ...catalogItems,
  ...companyItems,
]
  .filter((i): i is NavItem & { section: string } => Boolean(i.section))
  .map((i) => ({ id: i.section, label: i.label }));

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
