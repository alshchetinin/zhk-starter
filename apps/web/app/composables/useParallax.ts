import { useScroll, useTransform } from "motion-v";

export function useParallax(factor: number = 0.3) {
  const containerRef = ref<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, factor * 200]);

  return { containerRef, y };
}
