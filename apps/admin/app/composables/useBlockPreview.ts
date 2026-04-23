import type { ContentBlock } from "@zhk/api/shared/blocks";

export type PreviewViewport = "desktop" | "tablet" | "mobile";

export function useBlockPreview() {
  const { currentSite } = useCurrentSite();
  const config = useRuntimeConfig();

  const viewport = ref<PreviewViewport>("desktop");
  const iframeRef = ref<HTMLIFrameElement | null>(null);
  const iframeReady = ref(false);
  const pendingScrollY = ref<number | null>(null);

  const webOriginBase = (config.public.webOrigin as string) || "http://localhost:3001";
  const webUrl = new URL(webOriginBase);

  const webOrigin = computed(() => {
    const slug = currentSite.value?.slug;
    if (!slug || currentSite.value?.isPrimary) return webOriginBase;
    return `${webUrl.protocol}//${slug}.${webUrl.host}`;
  });

  const previewUrl = computed(() => `${webOrigin.value}/_preview`);

  function sendMessage(data: Record<string, unknown>) {
    iframeRef.value?.contentWindow?.postMessage(data, webOrigin.value);
  }

  function sendBlocks(blocks: ContentBlock[]) {
    sendMessage({
      type: "preview:update",
      blocks: JSON.parse(JSON.stringify(blocks)),
    });
  }

  function reloadPreview() {
    sendMessage({ type: "preview:get-scroll" });
  }

  function hardReload() {
    if (!iframeRef.value) return;
    iframeReady.value = false;
    const src = iframeRef.value.src;
    iframeRef.value.src = "";
    nextTick(() => {
      iframeRef.value!.src = src;
    });
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== webOrigin.value) return;

    if (event.data?.type === "preview:ready") {
      iframeReady.value = true;
      if (pendingScrollY.value !== null) {
        sendMessage({ type: "preview:restore-scroll", scrollY: pendingScrollY.value });
        pendingScrollY.value = null;
      }
    }

    if (event.data?.type === "preview:scroll-position") {
      pendingScrollY.value = event.data.scrollY ?? 0;
      hardReload();
    }
  }

  onMounted(() => window.addEventListener("message", handleMessage));
  onUnmounted(() => window.removeEventListener("message", handleMessage));

  return {
    viewport,
    iframeRef,
    iframeReady,
    previewUrl,
    webOrigin,
    sendBlocks,
    sendMessage,
    reloadPreview,
    hardReload,
  };
}
