<script setup lang="ts">
const model = defineModel<string>({ default: "" });

const mapContainer = ref<HTMLElement | null>(null);
const mapReady = ref(false);
let mapInstance: any = null;
let markerInstance: any = null;

const lat = computed({
  get: () => {
    if (!model.value) return 55.751244;
    const val = parseFloat(model.value.split(",")[0]);
    return isNaN(val) ? 55.751244 : val;
  },
  set: (v: number) => {
    model.value = `${v},${lng.value}`;
  },
});

const lng = computed({
  get: () => {
    if (!model.value) return 37.618423;
    const val = parseFloat(model.value.split(",")[1]);
    return isNaN(val) ? 37.618423 : val;
  },
  set: (v: number) => {
    model.value = `${lat.value},${v}`;
  },
});

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

async function initMap() {
  if (!mapContainer.value) return;

  await loadScript();
  const ymaps3 = (window as any).ymaps3;
  await ymaps3.ready;

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener, YMapMarker } =
    ymaps3;

  mapInstance = new YMap(mapContainer.value, {
    location: {
      center: [lng.value, lat.value],
      zoom: 14,
    },
  });

  mapInstance.addChild(new YMapDefaultSchemeLayer({}));
  mapInstance.addChild(new YMapDefaultFeaturesLayer({}));

  // Create marker element
  const markerEl = document.createElement("div");
  markerEl.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" class="text-red-500"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>';
  markerEl.style.transform = "translate(-16px, -32px)";

  if (model.value) {
    markerInstance = new YMapMarker(
      { coordinates: [lng.value, lat.value] },
      markerEl,
    );
    mapInstance.addChild(markerInstance);
  }

  // Click listener
  const listener = new YMapListener({
    layer: "any",
    onClick: (event: any, mapEvent: any) => {
      if (!mapEvent?.coordinates) return;
      const [clickLng, clickLat] = mapEvent.coordinates;
      model.value = `${clickLat.toFixed(6)},${clickLng.toFixed(6)}`;

      if (markerInstance) {
        mapInstance.removeChild(markerInstance);
      }
      markerInstance = new YMapMarker(
        { coordinates: [clickLng, clickLat] },
        markerEl,
      );
      mapInstance.addChild(markerInstance);
    },
  });
  mapInstance.addChild(listener);

  mapReady.value = true;
}

onMounted(() => {
  initMap();
});

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.destroy();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="space-y-3">
    <div
      ref="mapContainer"
      class="h-80 overflow-hidden rounded-lg border border-(--ui-border)"
    >
      <div
        v-if="!mapReady"
        class="flex h-full items-center justify-center text-(--ui-text-muted)"
      >
        <UIcon name="i-tabler-loader-2" class="animate-spin" />
        <span class="ml-2 text-sm">Загрузка карты...</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Широта">
        <UInput
          v-model.number="lat"
          type="number"
          step="0.000001"
          size="xl"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Долгота">
        <UInput
          v-model.number="lng"
          type="number"
          step="0.000001"
          size="xl"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
