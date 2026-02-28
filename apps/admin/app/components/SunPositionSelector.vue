<script setup lang="ts">
const props = defineProps<{
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const sunPosition = ref(props.modelValue ?? 0)
const isDragging = ref(false)

watch(() => props.modelValue, (newValue) => {
  if (newValue !== null) {
    sunPosition.value = newValue
  }
})

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  const container = event.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const dx = event.clientX - rect.left - centerX
  const dy = event.clientY - rect.top - centerY
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI)

  if (angle < 0) {
    angle += 360
  }

  sunPosition.value = Math.round(angle)
  emit('update:modelValue', sunPosition.value)
}

const startDragging = () => {
  isDragging.value = true
}

const stopDragging = () => {
  isDragging.value = false
}

const handleClick = (event: MouseEvent) => {
  const container = event.currentTarget as HTMLElement
  const rect = container.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const dx = event.clientX - rect.left - centerX
  const dy = event.clientY - rect.top - centerY
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI)

  if (angle < 0) {
    angle += 360
  }

  sunPosition.value = Math.round(angle)
  emit('update:modelValue', sunPosition.value)
}
</script>

<template>
  <div class="select-none">
    <p class="mb-2 flex items-center text-sm font-medium text-(--ui-text)">
      <UIcon name="i-tabler-sun-filled" class="mr-1.5 size-4 text-yellow-500" />
      Положение солнца относительно планировки
    </p>

    <div class="mb-2 rounded-md bg-blue-50 p-3 text-xs text-blue-700">
      <p>Укажите с какой стороны планировки всходит и заходит солнце, поворачивая траекторию движения солнца.</p>
    </div>

    <!-- Внешний контейнер с padding для иконок, которые выходят за круг -->
    <div class="mx-auto w-fit p-6 pb-8">
      <div
        class="relative size-[240px]"
        @mousemove="handleMouseMove"
        @mouseup="stopDragging"
        @mouseleave="stopDragging"
        @click="handleClick"
      >
        <!-- Круг с планировкой (центральный) -->
        <div class="absolute left-1/2 top-1/2 size-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-(--ui-border) bg-(--ui-bg-elevated)">
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-xs text-(--ui-text-muted)">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="mx-auto mb-1 size-10 text-(--ui-text-dimmed)"
              viewBox="0 0 24 24"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M2 22h20M5 8v14m7-14v14m7-14v14m3-11h-3M2 11h3m0-9h3v3H5zM5 5h14v3H5z"
              />
            </svg>
            Планировка квартиры
          </div>
        </div>

        <!-- Вращающийся полукруг с траекторией солнца -->
        <div
          class="absolute left-1/2 top-1/2 size-[240px] cursor-move"
          :style="{ transform: `translate(-50%, -50%) rotate(${sunPosition}deg)` }"
          @mousedown="startDragging"
        >
          <!-- Полупрозрачный полукруг для обозначения траектории -->
          <div class="absolute inset-0 overflow-hidden">
            <div class="absolute inset-0 rounded-full border-t-4 border-yellow-400/50" />
          </div>

          <!-- Восход (слева) -->
          <div class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <UIcon name="i-tabler-sunrise" class="size-5 text-yellow-500" />
          </div>

          <!-- Закат (справа) -->
          <div class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
            <UIcon name="i-tabler-moon" class="size-5 text-orange-500" />
          </div>

          <!-- Солнце в верхней точке (полдень) -->
          <div class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <UIcon name="i-tabler-sun-filled" class="size-7 text-yellow-500" />
          </div>
        </div>

        <!-- Градусы -->
        <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-(--ui-bg) px-3 py-1 text-center text-sm font-medium shadow-sm border border-(--ui-border)">
          {{ sunPosition }}°
        </div>
      </div>
    </div>
  </div>
</template>
