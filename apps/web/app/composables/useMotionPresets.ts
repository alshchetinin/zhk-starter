import type { AnimationConfig } from "@zhk/api/shared/theme";

const SPRING = {
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
  smooth: { type: "spring" as const, stiffness: 150, damping: 20 },
  bouncy: { type: "spring" as const, stiffness: 300, damping: 15 },
};

const DISTANCE = {
  none: 0,
  subtle: 12,
  moderate: 24,
  expressive: 48,
};

const DEFAULT_CONFIG: AnimationConfig = {
  intensity: "moderate",
  feel: "smooth",
  staggerDelay: 0.08,
  parallax: true,
  respectReducedMotion: true,
};

export function useMotionPresets(overrides?: Partial<AnimationConfig>) {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const reducedMotion = usePreferredReducedMotion();

  const disabled = computed(
    () =>
      config.intensity === "none" ||
      (config.respectReducedMotion && reducedMotion.value === "reduce"),
  );

  const spring = SPRING[config.feel];
  const distance = DISTANCE[config.intensity];

  const fadeUp = computed(() =>
    disabled.value
      ? {}
      : {
          initial: { opacity: 0, y: distance },
          whileInView: { opacity: 1, y: 0 },
          inViewOptions: { once: true },
          transition: spring,
        },
  );

  const fadeLeft = computed(() =>
    disabled.value
      ? {}
      : {
          initial: { opacity: 0, x: -distance },
          whileInView: { opacity: 1, x: 0 },
          inViewOptions: { once: true },
          transition: spring,
        },
  );

  const fadeRight = computed(() =>
    disabled.value
      ? {}
      : {
          initial: { opacity: 0, x: distance },
          whileInView: { opacity: 1, x: 0 },
          inViewOptions: { once: true },
          transition: spring,
        },
  );

  const fade = computed(() =>
    disabled.value
      ? {}
      : {
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          inViewOptions: { once: true },
          transition: { duration: 0.5 },
        },
  );

  const scaleIn = computed(() =>
    disabled.value
      ? {}
      : {
          initial: { opacity: 0, scale: 0.95 },
          whileInView: { opacity: 1, scale: 1 },
          inViewOptions: { once: true },
          transition: spring,
        },
  );

  /** Stagger container variants — use with :variants, initial="hidden", whileInView="show" */
  const staggerContainer = computed(() =>
    disabled.value
      ? {}
      : {
          hidden: { opacity: 1 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: config.staggerDelay,
              delayChildren: 0.1,
            },
          },
        },
  );

  /** Stagger child variants — use with :variants inside staggerContainer */
  const staggerChild = computed(() =>
    disabled.value
      ? {}
      : {
          hidden: { opacity: 0, y: distance },
          show: { opacity: 1, y: 0, transition: spring },
        },
  );

  const hoverScale = computed(() =>
    disabled.value
      ? {}
      : {
          whileHover: { scale: 1.02 },
          whilePress: { scale: 0.98 },
          transition: SPRING.snappy,
        },
  );

  return {
    disabled,
    spring,
    distance,
    config,
    fadeUp,
    fadeLeft,
    fadeRight,
    fade,
    scaleIn,
    staggerContainer,
    staggerChild,
    hoverScale,
  };
}
