export interface NavItem {
  label: string;
  icon: string;
  to: string;
  section?: string;
  adminOnly?: boolean;
}

const mainItems: NavItem[] = [
  { label: "Дашборд", icon: "i-solar-widget-5-linear", to: "/" },
];

// Per-site content — changes when site switcher is changed
const contentItems: NavItem[] = [
  { label: "Главная", icon: "i-solar-home-2-linear", to: "/homepage", section: "homepage" },
  { label: "Новости", icon: "i-solar-notebook-bookmark-linear", to: "/news", section: "news" },
  { label: "Страницы", icon: "i-solar-file-text-linear", to: "/pages", section: "pages" },
  { label: "Акции", icon: "i-solar-sale-linear", to: "/promotions", section: "promotions" },
  { label: "Документы", icon: "i-solar-file-check-linear", to: "/documents", section: "documents" },
  { label: "Модальные окна", icon: "i-solar-window-frame-linear", to: "/modals", section: "modals" },
];

// Shared across all sites
const catalogItems: NavItem[] = [
  { label: "Проекты", icon: "i-solar-buildings-linear", to: "/projects", section: "projects" },
  { label: "Дома", icon: "i-solar-buildings-2-linear", to: "/buildings", section: "buildings" },
  { label: "Квартиры", icon: "i-solar-home-linear", to: "/apartments", section: "apartments" },
  { label: "Коммерция", icon: "i-solar-cart-large-linear", to: "/commerce", section: "commerce" },
  { label: "Паркинги", icon: "i-solar-garage-linear", to: "/parking", section: "parking" },
  { label: "Кладовки", icon: "i-solar-box-linear", to: "/storage", section: "storage" },
  { label: "Планировки", icon: "i-solar-widget-2-linear", to: "/layouts", section: "layouts" },
  { label: "Теги", icon: "i-solar-tag-horizontal-linear", to: "/tags", section: "tags" },
  { label: "Ипотека", icon: "i-solar-dollar-minimalistic-linear", to: "/mortgage", section: "mortgage" },
  { label: "Способы покупки", icon: "i-solar-card-linear", to: "/purchase-methods", section: "purchase-methods" },
  { label: "Заявки", icon: "i-solar-inbox-linear", to: "/tickets", section: "tickets" },
];

// Company-wide brand info
const companyItems: NavItem[] = [
  { label: "Медиа", icon: "i-solar-gallery-linear", to: "/media" },
  { label: "Контакты", icon: "i-solar-notebook-linear", to: "/contacts", section: "contacts" },
  { label: "Соцсети", icon: "i-solar-plain-2-linear", to: "/socials", adminOnly: true },
];

// Admin-only system config
const systemItems: NavItem[] = [
  { label: "Сайты", icon: "i-solar-shop-2-linear", to: "/sites", adminOnly: true },
  { label: "Пользователи", icon: "i-solar-users-group-rounded-linear", to: "/users", adminOnly: true },
  { label: "Интеграции", icon: "i-solar-plug-circle-linear", to: "/integrations", adminOnly: true },
];

// Dev-only tools (content-type builder). Hidden in production.
const devItems: NavItem[] = import.meta.dev
  ? [
      { label: "Блоки", icon: "i-solar-widget-3-linear", to: "/dev/blocks", adminOnly: true },
      { label: "Коллекции", icon: "i-solar-layers-minimalistic-linear", to: "/dev/collections", adminOnly: true },
      { label: "Документация", icon: "i-solar-book-linear", to: "/dev/docs", adminOnly: true },
      { label: "Интеграция", icon: "i-solar-plug-circle-linear", to: "/dev/integration-provider", adminOnly: true },
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
