export function useMobileSidebar() {
  const isOpen = useState<boolean>("mobile-sidebar-open", () => false);

  function open() { isOpen.value = true; }
  function close() { isOpen.value = false; }
  function toggle() { isOpen.value = !isOpen.value; }

  return { isOpen, open, close, toggle };
}
