import type { ThemeConfig } from "../../packages/api/src/shared/theme.js";
import { generateBrandRamp, generateSurfaceRamp, generateColorCss, formatOklch } from "./oklch-ramp.js";
import { generateRadiusCss, generateSpacingCss, getDensityValues } from "./style-presets.js";
import { generateFontCss } from "./font-config.js";

const THEME_START = "/* --- THEME:START --- */";
const THEME_END = "/* --- THEME:END --- */";
const SEMANTIC_START = "/* --- SEMANTIC:START --- */";
const SEMANTIC_END = "/* --- SEMANTIC:END --- */";

export function buildThemeBlock(config: ThemeConfig): string {
  const brandRamp = generateBrandRamp(config.colors.brandHue, config.colors.brandChroma);
  const surfaceRamp = generateSurfaceRamp(
    config.colors.surfaceHue,
    config.colors.surfaceChroma,
  );

  const sections = [
    generateFontCss(config.typography),
    "",
    generateColorCss("brand", brandRamp, `Colors: Brand (hue ${config.colors.brandHue})`),
    "",
    generateColorCss("surface", surfaceRamp, `Colors: Surface (hue ${config.colors.surfaceHue})`),
    "",
    "  /* --- Colors: Semantic --- */",
    "  --color-success: oklch(0.6 0.15 145);",
    "  --color-warning: oklch(0.75 0.15 75);",
    "  --color-error: oklch(0.6 0.2 25);",
    `  --color-info: oklch(0.6 0.12 ${config.colors.brandHue});`,
    "",
    generateSpacingCss(config.style.density),
    "",
    generateRadiusCss(config.style.radiusProfile),
    "",
    `  /* --- Container widths --- */`,
    `  --container-3xl: 1440px;`,
  ];

  return `@theme {\n${sections.join("\n")}\n}`;
}

// Lightness values per accent step (from brand ramp)
const ACCENT_LIGHTNESS: Record<string, { main: number; hover: number }> = {
  "400": { main: 0.68, hover: 0.60 },
  "500": { main: 0.55, hover: 0.47 },
  "600": { main: 0.47, hover: 0.40 },
  "700": { main: 0.40, hover: 0.33 },
};

function buildCustomAccentLines(hue: number, chroma: number, step: string): string[] {
  const { main, hover } = ACCENT_LIGHTNESS[step] ?? ACCENT_LIGHTNESS["600"];
  return [
    `  --web-accent: ${formatOklch({ lightness: main, chroma, hue })};`,
    `  --web-accent-hover: ${formatOklch({ lightness: hover, chroma, hue })};`,
    `  --web-accent-light: ${formatOklch({ lightness: 0.97, chroma: chroma * 0.08, hue })};`,
  ];
}

export function buildSemanticBlock(config: ThemeConfig): string {
  const accentStep = config.colors.accentStep;
  const accentHoverStep = String(Math.min(Number(accentStep) + 100, 950));
  const density = getDensityValues(config.style.density);

  // When accentHue is set, generate accent as direct OKLCH values (separate hue from brand)
  const hasCustomAccent = config.colors.accentHue !== undefined && config.colors.accentChroma !== undefined;
  const accentLines = hasCustomAccent
    ? buildCustomAccentLines(config.colors.accentHue!, config.colors.accentChroma!, accentStep)
    : [
        `  --web-accent: var(--color-brand-${accentStep});`,
        `  --web-accent-hover: var(--color-brand-${accentHoverStep});`,
        `  --web-accent-light: var(--color-brand-50);`,
      ];

  const rootBlock = [
    `:root {`,
    `  /* Layout */`,
    `  --web-header-height: 4.5rem;`,
    `  --web-container-max: ${config.style.containerMax}px;`,
    `  --web-container-padding: ${density.containerPadding};`,
    ``,
    `  /* Text */`,
    `  --web-text-primary: var(--color-surface-900);`,
    `  --web-text-secondary: var(--color-surface-600);`,
    `  --web-text-muted: var(--color-surface-400);`,
    `  --web-text-inverse: white;`,
    ``,
    `  /* Background */`,
    `  --web-bg: white;`,
    `  --web-bg-muted: var(--color-surface-50);`,
    `  --web-bg-subtle: var(--color-surface-100);`,
    ``,
    `  /* Borders */`,
    `  --web-border: var(--color-surface-200);`,
    `  --web-border-hover: var(--color-surface-300);`,
    ``,
    `  /* Interactive */`,
    ...accentLines,
    `}`,
  ];

  const mediaBlocks = [
    ``,
    `@media (min-width: 768px) {`,
    `  :root {`,
    `    --web-container-padding: ${density.containerPaddingMd};`,
    `  }`,
    `}`,
    ``,
    `@media (min-width: 1024px) {`,
    `  :root {`,
    `    --web-container-padding: ${density.containerPaddingLg};`,
    `  }`,
    `}`,
  ];

  return [...rootBlock, ...mediaBlocks].join("\n");
}

export function replaceBetweenMarkers(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Маркеры не найдены: ${startMarker} / ${endMarker}`);
  }

  const afterEnd = endIdx + endMarker.length;
  return content.slice(0, startIdx + startMarker.length) + "\n" + replacement + "\n" + endMarker + content.slice(afterEnd);
}

export function applyThemeToCss(cssContent: string, config: ThemeConfig): string {
  let result = cssContent;

  result = replaceBetweenMarkers(result, THEME_START, THEME_END, buildThemeBlock(config));
  result = replaceBetweenMarkers(result, SEMANTIC_START, SEMANTIC_END, buildSemanticBlock(config));

  return result;
}
