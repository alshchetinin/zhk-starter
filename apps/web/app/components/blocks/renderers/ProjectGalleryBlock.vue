<script setup lang="ts">
const props = defineProps<{
  projectId: string;
  columns: "2" | "3" | "4";
  maxImages?: number;
  project?: {
    name: string;
    gallery: string[] | null;
    imageUrl: string | null;
  } | null;
}>();

const { fadeUp, staggerContainer, staggerChild } = useMotionPresets();

const images = computed(() => {
  const gallery = props.project?.gallery ?? [];
  const all =
    props.project?.imageUrl && !gallery.includes(props.project.imageUrl)
      ? [props.project.imageUrl, ...gallery]
      : gallery;
  return props.maxImages ? all.slice(0, props.maxImages) : all;
});

const gridClass = computed(() => {
  const map: Record<string, string> = {
    "2": "grid-cols-1 md:grid-cols-2",
    "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };
  return map[props.columns] ?? map["3"];
});
</script>

<template>
  <div v-if="project && images.length" class="section">
    <div class="container-web">
      <Motion as="h2" v-if="project.name" v-bind="fadeUp" class="mb-6 text-2xl font-bold">
        {{ project.name }}
      </Motion>
      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="grid gap-3"
        :class="gridClass"
      >
        <Motion
          as="img"
          v-for="(src, i) in images"
          :key="i"
          :variants="staggerChild"
          :src="src"
          :alt="`${project.name} — ${i + 1}`"
          :loading="i > 0 ? 'lazy' : undefined"
          class="aspect-[4/3] w-full rounded-lg object-cover"
        />
      </Motion>
    </div>
  </div>
</template>
