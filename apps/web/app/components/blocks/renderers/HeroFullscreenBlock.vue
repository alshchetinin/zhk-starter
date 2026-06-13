<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
  images: string[];
  address: string;
  district?: string;
  walkTime?: string;
  driveTime?: string;
  buildings: Array<{ label: string; date: string }>;
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
}>();

const currentSlide = ref(0);
const totalSlides = computed(() => props.images.length);
const ready = ref(false);

function prev() {
  currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value;
}
function next() {
  currentSlide.value = (currentSlide.value + 1) % totalSlides.value;
}

let interval: ReturnType<typeof setInterval>;
onMounted(() => {
  requestAnimationFrame(() => { ready.value = true; });
  if (totalSlides.value > 1) {
    interval = setInterval(next, 5000);
  }
});
onUnmounted(() => clearInterval(interval));
</script>

<template>
  <section class="hero" :class="{ 'is-ready': ready }">
    <!-- Full-bleed background image -->
    <div class="hero__bg">
      <TransitionGroup name="hero-img">
        <AppImage
          v-for="(src, i) in images"
          v-show="i === currentSlide"
          :key="src"
          :src="src"
          :alt="title"
          :width="1920"
          sizes="100vw"
          :loading="i === 0 ? 'eager' : 'lazy'"
          :preload="i === 0"
          class="hero__bg-img"
        />
      </TransitionGroup>
      <div class="hero__veil" />
    </div>

    <!-- The Line — brand motif -->
    <div class="hero__accent-line" aria-hidden="true" />

    <!-- Content layer -->
    <div class="hero__layer">
      <!-- Top: slide counter -->
      <div v-if="totalSlides > 1" class="hero__counter">
        <button class="hero__arrow" @click="prev" aria-label="Предыдущий">
          <Icon name="lucide:arrow-left" class="size-4" />
        </button>
        <span class="hero__count-text">
          {{ String(currentSlide + 1).padStart(2, '0') }}
          <span class="hero__count-sep">&mdash;</span>
          {{ String(totalSlides).padStart(2, '0') }}
        </span>
        <button class="hero__arrow" @click="next" aria-label="Следующий">
          <Icon name="lucide:arrow-right" class="size-4" />
        </button>
      </div>

      <!-- Middle: title + description -->
      <div class="hero__headline">
        <h1 class="hero__title">{{ title }}</h1>
        <p v-if="description" class="hero__desc">{{ description }}</p>
      </div>

      <!-- Bottom bar -->
      <div class="hero__bar">
        <div class="hero__bar-inner">
          <!-- Address cluster -->
          <div class="hero__address">
            <span class="hero__address-text">{{ address }}</span>
            <span class="hero__address-meta">
              <template v-if="district">
                <Icon name="lucide:map-pin" class="hero__meta-ic" />{{ district }}
              </template>
              <template v-if="walkTime">
                <Icon name="lucide:footprints" class="hero__meta-ic" />{{ walkTime }}
              </template>
              <template v-if="driveTime">
                <Icon name="lucide:car" class="hero__meta-ic" />{{ driveTime }}
              </template>
            </span>
          </div>

          <!-- Buildings / deadlines -->
          <div class="hero__deadlines">
            <div v-for="b in buildings" :key="b.label" class="hero__deadline">
              <span class="hero__dl-label">{{ b.label }}</span>
              <span class="hero__dl-date">{{ b.date }}</span>
            </div>
          </div>

          <!-- CTAs -->
          <div class="hero__ctas">
            <a
              v-if="secondaryButtonLabel"
              :href="secondaryButtonUrl"
              class="hero__cta hero__cta--ghost"
            >{{ secondaryButtonLabel }}</a>
            <a
              v-if="primaryButtonLabel"
              :href="primaryButtonUrl"
              class="hero__cta hero__cta--solid"
            >{{ primaryButtonLabel }}</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ══════════════════════════════════════
   АВТОРИКА HERO — Editorial Cinematic
   ══════════════════════════════════════ */

.hero {
  --h-green: #51655A;
  --h-green-deep: #3d4e44;
  --h-cream: #FFF8F3;
  --h-coral: #D8613F;
  --h-blue: #A3B4BE;

  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--h-green-deep);
  color: var(--h-cream);
}

/* ── Background image ── */
.hero__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero__bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform, opacity;
}

/* Sophisticated veil: green→transparent diagonal + bottom fade */
.hero__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      165deg,
      rgba(61, 78, 68, 0.92) 0%,
      rgba(61, 78, 68, 0.78) 25%,
      rgba(61, 78, 68, 0.35) 55%,
      rgba(61, 78, 68, 0.10) 80%,
      transparent 100%
    ),
    linear-gradient(
      to top,
      rgba(61, 78, 68, 0.85) 0%,
      transparent 40%
    );
}

/* ── The accent line — Авторика brand motif ── */
.hero__accent-line {
  position: absolute;
  left: clamp(1.5rem, 6vw, 5rem);
  top: 30%;
  width: 3px;
  height: 0;
  background: var(--h-coral);
  z-index: 2;
  transition: height 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.6s;
}

.hero.is-ready .hero__accent-line {
  height: 25vh;
}

/* ── Content layer ── */
.hero__layer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100svh;
  padding: calc(var(--web-header-height, 4.5rem) + 2rem) var(--web-container-padding) 0;
}

/* ── Slide counter (top-right) ── */
.hero__counter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  align-self: flex-end;
  opacity: 0;
  transform: translateY(-8px);
  transition: all 0.6s ease 1s;
}

.hero.is-ready .hero__counter {
  opacity: 1;
  transform: none;
}

.hero__arrow {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 248, 243, 0.2);
  background: rgba(255, 248, 243, 0.04);
  color: var(--h-cream);
  cursor: pointer;
  transition: all 0.25s ease;
  backdrop-filter: blur(4px);
}

.hero__arrow:hover {
  background: rgba(255, 248, 243, 0.12);
  border-color: rgba(255, 248, 243, 0.4);
}

.hero__count-text {
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  color: rgba(255, 248, 243, 0.6);
}

.hero__count-sep {
  margin-inline: 0.15em;
  opacity: 0.4;
}

/* ── Headline area ── */
.hero__headline {
  max-width: 52rem;
  padding-left: clamp(0rem, 4vw, 3.5rem);
  opacity: 0;
  transform: translateY(32px);
  transition: all 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
}

.hero.is-ready .hero__headline {
  opacity: 1;
  transform: none;
}

.hero__title {
  font-size: clamp(2.75rem, 7vw, 6rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.hero__desc {
  margin-top: 1.5rem;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  line-height: 1.55;
  max-width: 38ch;
  color: rgba(255, 248, 243, 0.65);
  padding-left: 1.75rem;
  border-left: 2px solid var(--h-coral);
}

/* ── Bottom bar ── */
.hero__bar {
  margin-top: auto;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.7s ease 0.8s;
}

.hero.is-ready .hero__bar {
  opacity: 1;
  transform: none;
}

.hero__bar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2rem;
  padding: 1.25rem 0;
  border-top: 1px solid rgba(255, 248, 243, 0.12);
  background: linear-gradient(to top, rgba(61, 78, 68, 0.5), transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding-inline: clamp(0rem, 4vw, 3.5rem);
  margin-inline: calc(-1 * var(--web-container-padding));
  padding-inline: var(--web-container-padding);
  padding-bottom: 1.5rem;
}

/* Address */
.hero__address {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hero__address-text {
  font-weight: 600;
  font-size: 0.9375rem;
}

.hero__address-meta {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.75rem;
  color: rgba(255, 248, 243, 0.45);
}

.hero__meta-ic {
  width: 0.8125rem;
  height: 0.8125rem;
  margin-right: 0.15rem;
}

/* Deadlines */
.hero__deadlines {
  display: flex;
  gap: 0;
}

.hero__deadline {
  display: flex;
  flex-direction: column;
  padding-inline: 1.25rem;
  border-left: 1px solid rgba(255, 248, 243, 0.12);
}

.hero__deadline:last-child {
  padding-right: 0;
}

.hero__dl-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 248, 243, 0.4);
}

.hero__dl-date {
  font-weight: 600;
  font-size: 0.9375rem;
  margin-top: 0.125rem;
}

/* CTAs */
.hero__ctas {
  display: flex;
  gap: 0.625rem;
  margin-left: auto;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.75rem;
  padding-inline: 1.75rem;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.25s ease;
  cursor: pointer;
}

.hero__cta--ghost {
  border: 1px solid rgba(255, 248, 243, 0.25);
  color: var(--h-cream);
  background: rgba(255, 248, 243, 0.04);
  backdrop-filter: blur(4px);
}

.hero__cta--ghost:hover {
  background: rgba(255, 248, 243, 0.1);
  border-color: rgba(255, 248, 243, 0.4);
}

.hero__cta--solid {
  background: var(--h-coral);
  color: var(--h-cream);
  border: none;
}

.hero__cta--solid:hover {
  background: #c4553a;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(216, 97, 63, 0.35);
}

/* ── Image transitions ── */
.hero-img-enter-active {
  transition: opacity 1s ease, transform 1s ease;
}

.hero-img-leave-active {
  transition: opacity 0.8s ease;
}

.hero-img-enter-from {
  opacity: 0;
  transform: scale(1.04);
}

.hero-img-leave-to {
  opacity: 0;
}

/* Subtle Ken Burns on active slide */
.hero__bg-img {
  animation: hero-ken-burns 12s ease-in-out alternate infinite;
}

@keyframes hero-ken-burns {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}

/* ── Responsive ── */
@media (max-width: 767px) {
  .hero__bar-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.25rem;
  }
  .hero__ctas {
    margin-left: 0;
    width: 100%;
  }
  .hero__cta {
    flex: 1;
  }
  .hero__accent-line {
    left: 1rem;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .hero__bar-inner {
    gap: 1.5rem;
  }
}
</style>
