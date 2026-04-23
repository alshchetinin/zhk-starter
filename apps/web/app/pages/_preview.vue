<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { PREVIEW_MESSAGE } from "@zhk/api/shared/constants";

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

  if (type === PREVIEW_MESSAGE.Update) {
    blocks.value = (payload.blocks ?? []) as ContentBlock[];
  }

  if (type === PREVIEW_MESSAGE.ScrollTo) {
    const el = document.getElementById(`block-${payload.blockId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (type === PREVIEW_MESSAGE.GetScroll) {
    sendToAdmin(PREVIEW_MESSAGE.ScrollPosition, { scrollY: window.scrollY });
  }

  if (type === PREVIEW_MESSAGE.RestoreScroll) {
    window.scrollTo(0, Number(payload.scrollY) || 0);
  }
}

onMounted(() => {
  window.addEventListener("message", handleMessage);
  sendToAdmin(PREVIEW_MESSAGE.Ready);
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
