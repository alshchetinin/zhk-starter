<script setup lang="ts">
defineProps<{
  title: string;
  phone: string;
  email: string;
  address: string;
  buttonText?: string;
  buttonUrl?: string;
  departments?: Array<{ name: string; phone: string; email?: string }>;
}>();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <h2 class="text-3xl font-bold tracking-tight text-[var(--web-text-primary)] md:text-4xl">
        {{ title }}
      </h2>

      <!-- Main contacts -->
      <div class="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div class="flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-[var(--web-text-muted)]">Телефон</div>
            <a :href="`tel:${phone.replace(/\s/g, '')}`" class="mt-1 block text-lg font-semibold text-[var(--web-text-primary)] hover:text-[var(--web-accent)]">
              {{ phone }}
            </a>
          </div>
          <div>
            <div class="text-xs font-medium uppercase tracking-wider text-[var(--web-text-muted)]">Email</div>
            <a :href="`mailto:${email}`" class="mt-1 block text-lg font-semibold text-[var(--web-text-primary)] hover:text-[var(--web-accent)]">
              {{ email }}
            </a>
          </div>
        </div>

        <a
          v-if="buttonText && buttonUrl"
          :href="buttonUrl"
          class="inline-flex shrink-0 items-center rounded-lg bg-[var(--web-accent)] px-6 py-3 text-sm font-medium text-[var(--web-text-inverse)] transition-colors hover:bg-[var(--web-accent-hover)]"
        >
          {{ buttonText }}
        </a>
      </div>

      <!-- Address -->
      <div class="mt-6 flex items-start gap-2 text-[var(--web-text-secondary)]">
        <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0" />
        <span>{{ address }}</span>
      </div>

      <!-- Departments -->
      <div v-if="departments?.length" class="mt-10 border-t border-[var(--web-border)]">
        <div
          v-for="(dept, i) in departments"
          :key="i"
          class="flex flex-col gap-2 border-b border-[var(--web-border)] py-4 md:flex-row md:items-center md:gap-8"
        >
          <div class="min-w-[200px] font-medium text-[var(--web-text-secondary)]">
            {{ dept.name }}
          </div>
          <a :href="`tel:${dept.phone.replace(/\s/g, '')}`" class="text-[var(--web-text-primary)] hover:text-[var(--web-accent)]">
            {{ dept.phone }}
          </a>
          <a v-if="dept.email" :href="`mailto:${dept.email}`" class="text-[var(--web-text-primary)] hover:text-[var(--web-accent)]">
            {{ dept.email }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
