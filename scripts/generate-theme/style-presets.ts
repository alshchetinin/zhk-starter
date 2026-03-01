import type { StyleConfig } from "../../packages/api/src/shared/theme.js";

// --- Border Radius ---

const RADIUS_PRESETS: Record<StyleConfig["radiusProfile"], Record<string, string>> = {
  sharp: {
    sm: "0.125rem",
    md: "0.25rem",
    lg: "0.375rem",
    xl: "0.5rem",
    "2xl": "0.75rem",
  },
  soft: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
  },
  round: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "9999px",
  },
};

// --- Spacing / Density ---

interface DensityValues {
  sectionPadding: string;
  sectionPaddingSm: string;
  containerPadding: string;
  containerPaddingMd: string;
  containerPaddingLg: string;
}

const DENSITY_PRESETS: Record<StyleConfig["density"], DensityValues> = {
  airy: {
    sectionPadding: "6rem",
    sectionPaddingSm: "4rem",
    containerPadding: "2rem",
    containerPaddingMd: "2.5rem",
    containerPaddingLg: "3rem",
  },
  balanced: {
    sectionPadding: "5rem",
    sectionPaddingSm: "3rem",
    containerPadding: "1.5rem",
    containerPaddingMd: "2rem",
    containerPaddingLg: "2.5rem",
  },
  compact: {
    sectionPadding: "3.5rem",
    sectionPaddingSm: "2rem",
    containerPadding: "1rem",
    containerPaddingMd: "1.5rem",
    containerPaddingLg: "2rem",
  },
};

// --- Shadow ---

const SHADOW_PRESETS: Record<StyleConfig["shadowProfile"], string> = {
  none: "none",
  subtle: "0 1px 2px oklch(0 0 0 / 0.05)",
  medium: "0 4px 12px oklch(0 0 0 / 0.08)",
  dramatic: "0 8px 30px oklch(0 0 0 / 0.12)",
};

export function getRadiusValues(profile: StyleConfig["radiusProfile"]): Record<string, string> {
  return RADIUS_PRESETS[profile];
}

export function getDensityValues(density: StyleConfig["density"]): DensityValues {
  return DENSITY_PRESETS[density];
}

export function getShadowValue(profile: StyleConfig["shadowProfile"]): string {
  return SHADOW_PRESETS[profile];
}

export function generateRadiusCss(profile: StyleConfig["radiusProfile"]): string {
  const values = RADIUS_PRESETS[profile];
  const lines = [`  /* --- Border Radius (${profile}) --- */`];
  for (const [key, val] of Object.entries(values)) {
    lines.push(`  --radius-${key}: ${val};`);
  }
  return lines.join("\n");
}

export function generateSpacingCss(density: StyleConfig["density"]): string {
  const d = DENSITY_PRESETS[density];
  return [
    `  /* --- Spacing (${density}) --- */`,
    `  --spacing-section: ${d.sectionPadding};`,
    `  --spacing-section-sm: ${d.sectionPaddingSm};`,
  ].join("\n");
}
