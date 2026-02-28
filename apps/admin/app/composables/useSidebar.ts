const STORAGE_KEY = "sidebar-collapsed";

export function useSidebar() {
  const isCollapsed = useState<boolean>("sidebar-collapsed", () => false);

  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      isCollapsed.value = stored === "true";
    }

    watch(isCollapsed, (val) => {
      localStorage.setItem(STORAGE_KEY, String(val));
    });
  }

  function toggle() { isCollapsed.value = !isCollapsed.value; }
  function expand() { isCollapsed.value = false; }
  function collapse() { isCollapsed.value = true; }

  return { isCollapsed, toggle, expand, collapse };
}
