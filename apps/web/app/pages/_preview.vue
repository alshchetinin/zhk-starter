<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";

definePageMeta({ layout: "default" });

const config = useRuntimeConfig();
const blocks = ref<ContentBlock[]>([]);
const adminOrigin = config.public.adminOrigin as string;

function sendToAdmin(type: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.parent.postMessage({ type, ...data }, adminOrigin || "*");
}

function handleMessage(event: MessageEvent) {
  if (adminOrigin && event.origin !== adminOrigin) return;

  const { type, ...payload } = event.data ?? {};

  if (type === "preview:update") {
    blocks.value = (payload.blocks ?? []) as ContentBlock[];
  }

  if (type === "preview:scroll-to") {
    const el = document.getElementById(`block-${payload.blockId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (type === "preview:get-scroll") {
    sendToAdmin("preview:scroll-position", { scrollY: window.scrollY });
  }

  if (type === "preview:restore-scroll") {
    window.scrollTo(0, Number(payload.scrollY) || 0);
  }
}

onMounted(() => {
  window.addEventListener("message", handleMessage);
  sendToAdmin("preview:ready");
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("message", handleMessage);
  }
});
</script>

<template>
  <div>
    <BlockRenderer v-if="blocks.length" :blocks="blocks" />
    <div v-else class="flex items-center justify-center min-h-svh text-(--web-text-muted)">
      Ожидание данных…
    </div>
  </div>
</template>
