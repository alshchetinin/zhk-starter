import type { TypographyConfig } from "../../packages/api/src/shared/theme.js";

export interface FontGeneratedConfig {
  fontSans: string;
  fontDisplay: string;
  fontProvider: string;
  fontWeights: number[];
}

export function buildFontConfig(typography: TypographyConfig): FontGeneratedConfig {
  return {
    fontSans: typography.fontSans,
    fontDisplay: typography.fontDisplay,
    fontProvider: typography.fontProvider,
    fontWeights: typography.fontWeights,
  };
}

export function generateFontCss(typography: TypographyConfig): string {
  const sans = `"${typography.fontSans}", ui-sans-serif, system-ui, sans-serif`;
  const display =
    typography.fontDisplay !== typography.fontSans
      ? `"${typography.fontDisplay}", ui-sans-serif, system-ui, sans-serif`
      : sans;

  return [
    `  /* --- Typography --- */`,
    `  --font-sans: ${sans};`,
    `  --font-display: ${display};`,
  ].join("\n");
}
