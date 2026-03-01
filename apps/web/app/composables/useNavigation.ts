export interface NavItem {
  label: string;
  to: string;
}

export const navItems: NavItem[] = [
  { label: "Проекты", to: "/projects" },
  { label: "Новости", to: "/news" },
  { label: "Документы", to: "/documents" },
  { label: "Акции", to: "/promotions" },
];
