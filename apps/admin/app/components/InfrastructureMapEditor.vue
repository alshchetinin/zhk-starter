<script setup lang="ts">
import type { InfraCategory, InfraPin } from "@zhk/db/schema";

const props = defineProps<{
  pins: InfraPin[];
  categories: InfraCategory[];
  center: string;
}>();

const emit = defineEmits<{
  addPin: [coordinates: string];
  selectPin: [pinId: string];
}>();

const mapContainer = ref<HTMLElement | null>(null);
const mapReady = ref(false);
let mapInstance: any = null;
let markerInstances = new Map<string, { marker: any; element: HTMLDivElement }>();

const config = useRuntimeConfig();

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).ymaps3) {
      resolve();
      return;
    }
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    const apiKey = config.public.yandexMapsApiKey || "";
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });
}

function parseCoords(str: string): [number, number] {
  const [lat, lng] = str.split(",").map(Number);
  return [lng || 37.618423, lat || 55.751244];
}

function getCategoryColor(categoryId: string): string {
  const cat = props.categories.find((c) => c.id === categoryId);
  return cat?.color || "#6b7280";
}

function createMarkerElement(pin: InfraPin): HTMLDivElement {
  const el = document.createElement("div");
  const color = getCategoryColor(pin.categoryId);
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`;
  el.style.transform = "translate(-14px, -28px)";
  el.style.cursor = "pointer";
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    emit("selectPin", pin.id);
  });
  return el;
}

function syncMarkers() {
  if (!mapInstance) return;
  const ymaps3 = (window as any).ymaps3;
  const { YMapMarker } = ymaps3;

  // Remove old markers
  for (const [id, { marker }] of markerInstances) {
    if (!props.pins.find((p) => p.id === id)) {
      mapInstance.removeChild(marker);
      markerInstances.delete(id);
    }
  }

  // Add/update markers
  for (const pin of props.pins) {
    if (!pin.coordinates) continue;
    const coords = parseCoords(pin.coordinates);

    const existing = markerInstances.get(pin.id);
    if (existing) {
      // Update: remove old, add new
      mapInstance.removeChild(existing.marker);
    }

    const el = createMarkerElement(pin);
    const marker = new YMapMarker({ coordinates: coords }, el);
    mapInstance.addChild(marker);
    markerInstances.set(pin.id, { marker, element: el });
  }
}

async function initMap() {
  if (!mapContainer.value) return;

  await loadScript();
  const ymaps3 = (window as any).ymaps3;
  await ymaps3.ready;

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener, YMapMarker } = ymaps3;

  const center = props.center ? parseCoords(props.center) : [37.618423, 55.751244];

  mapInstance = new YMap(mapContainer.value, {
    location: { center, zoom: 13 },
  });

  mapInstance.addChild(new YMapDefaultSchemeLayer({}));
  mapInstance.addChild(new YMapDefaultFeaturesLayer({}));

  // Project location marker
  if (props.center) {
    const projectEl = document.createElement("div");
    projectEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#000;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11l6-3v13"/></svg></div>`;
    projectEl.style.transform = "translate(-18px, -18px)";
    const projectMarker = new YMapMarker({ coordinates: center }, projectEl);
    mapInstance.addChild(projectMarker);
  }

  const listener = new YMapListener({
    layer: "any",
    onClick: (_event: any, mapEvent: any) => {
      if (!mapEvent?.coordinates) return;
      const [clickLng, clickLat] = mapEvent.coordinates;
      emit("addPin", `${clickLat.toFixed(6)},${clickLng.toFixed(6)}`);
    },
  });
  mapInstance.addChild(listener);

  syncMarkers();
  mapReady.value = true;
}

const stopWatch = watch(() => [props.pins, props.categories], syncMarkers, { deep: true });

onMounted(() => { initMap(); });

onUnmounted(() => {
  stopWatch();
  markerInstances.clear();
  if (mapInstance) {
    mapInstance.destroy();
    mapInstance = null;
  }
});
</script>

<template>
  <div
    ref="mapContainer"
    class="h-full min-h-[500px] overflow-hidden rounded-lg border border-(--ui-border)"
  >
    <div
      v-if="!mapReady"
      class="flex h-full items-center justify-center text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span class="ml-2 text-sm">Загрузка карты...</span>
    </div>
  </div>
</template>
