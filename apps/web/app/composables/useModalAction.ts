export function useModalAction() {
  const activeModalSlug = useState<string | null>("modal-slug", () => null);

  function open(slug: string) {
    activeModalSlug.value = slug;
  }

  function close() {
    activeModalSlug.value = null;
  }

  return {
    activeModalSlug: readonly(activeModalSlug),
    open,
    close,
  };
}
