<script setup lang="ts">
const props = defineProps<{
  projectId: string;
  mapHeight?: number;
  showCategories?: boolean;
  project?: {
    name: string;
    coordinates?: string | null;
    infrastructureCategories?: Array<{ id: string; name: string; icon: string; color: string }>;
    infrastructurePins?: Array<{ id: string; title: string; coordinates: string; categoryId: string; description?: string }>;
  } | null;
}>();

const allCategories = computed(() => props.project?.infrastructureCategories ?? []);
const allPins = computed(() => props.project?.infrastructurePins ?? []);

// Only categories that have at least one pin
const usedCategoryIds = computed(() => new Set(allPins.value.map((p) => p.categoryId)));
const categories = computed(() => allCategories.value.filter((c) => usedCategoryIds.value.has(c.id)));
const activeCategory = ref<string | null>(null);

const filteredPins = computed(() =>
  activeCategory.value
    ? allPins.value.filter((p) => p.categoryId === activeCategory.value)
    : allPins.value,
);

function getCategoryColor(categoryId: string): string {
  return allCategories.value.find((c) => c.id === categoryId)?.color ?? "#6b7280";
}

// Map
const mapContainer = ref<HTMLElement | null>(null);
const mapReady = ref(false);
let mapInstance: any = null;
let markerInstances: any[] = [];

function parseCoords(str: string): [number, number] {
  const [lat, lng] = str.split(",").map(Number);
  return [lng || 37.618423, lat || 55.751244];
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).ymaps3) { resolve(); return; }
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
    if (existingScript) { existingScript.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${useRuntimeConfig().public.yandexMapsApiKey || ""}&lang=ru_RU`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });
}

async function initMap() {
  if (!mapContainer.value) return;
  await loadScript();
  const ymaps3 = (window as any).ymaps3;
  await ymaps3.ready;

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
  const center = props.project?.coordinates ? parseCoords(props.project.coordinates) : [37.618423, 55.751244];

  mapInstance = new YMap(mapContainer.value, { location: { center, zoom: 14 } });
  mapInstance.addChild(new YMapDefaultSchemeLayer({}));
  mapInstance.addChild(new YMapDefaultFeaturesLayer({}));

  // Project marker
  if (props.project?.coordinates) {
    const el = document.createElement("div");
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#000;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11l6-3v13"/></svg></div>`;
    el.style.transform = "translate(-20px, -20px)";
    mapInstance.addChild(new YMapMarker({ coordinates: center }, el));
  }

  renderPins();
  mapReady.value = true;
}

function renderPins() {
  if (!mapInstance) return;
  const ymaps3 = (window as any).ymaps3;
  const { YMapMarker } = ymaps3;

  // Clear old
  for (const m of markerInstances) mapInstance.removeChild(m);
  markerInstances = [];

  for (const pin of filteredPins.value) {
    if (!pin.coordinates) continue;
    const coords = parseCoords(pin.coordinates);
    const color = getCategoryColor(pin.categoryId);

    const el = document.createElement("div");
    el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`;
    el.style.transform = "translate(-14px, -28px)";
    el.title = pin.title;

    const marker = new YMapMarker({ coordinates: coords }, el);
    mapInstance.addChild(marker);
    markerInstances.push(marker);
  }
}

watch(filteredPins, renderPins, { deep: true });

onMounted(() => { initMap(); });
onUnmounted(() => {
  markerInstances = [];
  if (mapInstance) { mapInstance.destroy(); mapInstance = null; }
});
</script>

<template>
  <div class="section">
    <div class="container-web">
      <!-- Category filter -->
      <div v-if="showCategories !== false && categories.length > 0" class="flex flex-wrap gap-2 mb-6">
        <button
          class="px-4 py-2 rounded-full text-sm font-medium transition-colors border"
          :class="activeCategory === null
            ? 'bg-[var(--web-accent)] text-white border-[var(--web-accent)]'
            : 'border-[var(--web-border)] text-[var(--web-text-secondary)] hover:border-[var(--web-accent)]'"
          @click="activeCategory = null"
        >
          Все
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="px-4 py-2 rounded-full text-sm font-medium transition-colors border flex items-center gap-2"
          :class="activeCategory === cat.id
            ? 'text-white border-transparent'
            : 'border-[var(--web-border)] text-[var(--web-text-secondary)] hover:border-[var(--web-accent)]'"
          :style="activeCategory === cat.id ? { backgroundColor: cat.color } : {}"
          @click="activeCategory = activeCategory === cat.id ? null : cat.id"
        >
          <Icon v-if="!cat.icon.startsWith('http')" :name="cat.icon" class="size-4" />
          <AppImage v-else :src="cat.icon" alt="" :width="32" class="size-4" />
          {{ cat.name }}
        </button>
      </div>

      <!-- Map -->
      <div
        ref="mapContainer"
        class="w-full overflow-hidden rounded-[var(--radius-xl)]"
        :style="{ height: `${mapHeight ?? 500}px` }"
      >
        <div v-if="!mapReady" class="flex h-full items-center justify-center text-[var(--web-text-muted)]">
          Загрузка карты...
        </div>
      </div>
    </div>
  </div>
</template>
