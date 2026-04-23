<script setup lang="ts">
const { isImpersonating, impersonated, stopImpersonation } = useCurrentUser();
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    leave-active-class="transition-all duration-150"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="isImpersonating"
      class="sticky top-0 z-50 w-full bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-md"
    >
      <UIcon name="i-tabler-eye" class="size-5" />
      <span class="text-sm font-medium">
        Режим предпросмотра прав: {{ impersonated?.name ?? impersonated?.email ?? "Редактор" }}
      </span>
      <span class="text-xs opacity-80">— все действия заблокированы</span>
      <UButton
        size="xs"
        variant="solid"
        color="neutral"
        icon="i-tabler-x"
        class="ml-3"
        @click="stopImpersonation"
      >
        Выйти
      </UButton>
    </div>
  </Transition>
</template>
