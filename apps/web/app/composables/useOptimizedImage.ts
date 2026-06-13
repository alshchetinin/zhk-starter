interface OptimizeModifiers {
  width?: number;
  height?: number;
  fit?: string;
  quality?: number;
}

/**
 * Возвращает строковый оптимизированный URL картинки (через imgproxy).
 * Для тегов используйте <AppImage>. Этот композабл — для случаев, где нужен
 * именно строковый URL: background-image, og:image, JSON-LD.
 * При IMG_PROXY_ENABLED=false возвращает исходный URL без изменений.
 */
export function useOptimizedImage() {
  const img = useImage();
  const config = useRuntimeConfig();

  return (src: string | null | undefined, modifiers: OptimizeModifiers = {}): string => {
    if (!src) return "";
    if (!config.public.imgProxy.enabled) return src;
    return img(src, { quality: 80, ...modifiers }, { provider: "imgproxy" });
  };
}
