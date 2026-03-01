/**
 * Generates 11-step OKLCH color ramps (50-950) from hue + chroma.
 *
 * Lightness and relative chroma scaling are derived from the hand-tuned
 * values in the original main.css. Only hue and max chroma change per brand.
 */

interface OklchColor {
  lightness: number;
  chroma: number;
  hue: number;
}

// Lightness progression for brand colors (50 → 950)
const BRAND_LIGHTNESS = [0.97, 0.93, 0.87, 0.78, 0.68, 0.55, 0.47, 0.4, 0.33, 0.27, 0.2];
// Relative chroma multiplier at each step (peaks at 500-600)
const BRAND_CHROMA_SCALE = [0.08, 0.17, 0.33, 0.58, 0.83, 1.0, 1.0, 0.83, 0.67, 0.5, 0.33];

// Lightness progression for surface/neutral colors
const SURFACE_LIGHTNESS = [0.985, 0.97, 0.92, 0.87, 0.71, 0.55, 0.45, 0.37, 0.27, 0.2, 0.14];
// Surface chroma is flat (slight variation in original)
const SURFACE_CHROMA_SCALE = [0.33, 0.67, 1.0, 1.33, 1.67, 1.67, 1.67, 1.67, 1.33, 1.0, 0.67];

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Surface hue shift: original CSS shifts from 80 to 75 at step 300+
const SURFACE_HUE_SHIFT_INDEX = 3; // step 300
const SURFACE_HUE_SHIFT = -5;

export function generateBrandRamp(hue: number, maxChroma: number): Map<number, OklchColor> {
  const ramp = new Map<number, OklchColor>();
  for (let i = 0; i < STEPS.length; i++) {
    ramp.set(STEPS[i], {
      lightness: BRAND_LIGHTNESS[i],
      chroma: +(maxChroma * BRAND_CHROMA_SCALE[i]).toFixed(3),
      hue,
    });
  }
  return ramp;
}

export function generateSurfaceRamp(hue: number, maxChroma: number): Map<number, OklchColor> {
  const ramp = new Map<number, OklchColor>();
  for (let i = 0; i < STEPS.length; i++) {
    ramp.set(STEPS[i], {
      lightness: SURFACE_LIGHTNESS[i],
      chroma: +(maxChroma * SURFACE_CHROMA_SCALE[i]).toFixed(3),
      hue: i >= SURFACE_HUE_SHIFT_INDEX ? hue + SURFACE_HUE_SHIFT : hue,
    });
  }
  return ramp;
}

export function formatOklch(c: OklchColor): string {
  return `oklch(${c.lightness} ${c.chroma} ${c.hue})`;
}

export function generateColorCss(
  prefix: string,
  ramp: Map<number, OklchColor>,
  comment: string,
): string {
  const lines = [`  /* --- ${comment} --- */`];
  for (const step of STEPS) {
    const color = ramp.get(step)!;
    lines.push(`  --color-${prefix}-${step}: ${formatOklch(color)};`);
  }
  return lines.join("\n");
}
