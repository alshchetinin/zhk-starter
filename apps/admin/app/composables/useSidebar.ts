export const useSidebar = createSharedComposable(() => {
  const isCollapsed = useLocalStorage("sidebar-collapsed", false);

  function toggle() { isCollapsed.value = !isCollapsed.value; }
  function expand() { isCollapsed.value = false; }
  function collapse() { isCollapsed.value = true; }

  return { isCollapsed, toggle, expand, collapse };
});
