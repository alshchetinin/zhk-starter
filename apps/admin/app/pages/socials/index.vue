<script setup lang="ts">
</script>

<template>
  <PageContainer>
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Соцсети</h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">
        Общие ссылки на соцсети компании. Используются во всех сайтах по умолчанию — можно переопределить на конкретном сайте или контакте.
      </p>
    </div>

    <div class="max-w-2xl">
      <SocialLinksEditor
        :site-id="null"
        title="Общие соцсети компании"
        description="Показываются на всех сайтах, если не задано переопределение"
      />
    </div>
  </PageContainer>
</template>
