import { z } from "zod";

// --- Colors ---

export const colorConfigSchema = z.object({
  /** Primary brand hue (OKLCH, 0-360) */
  brandHue: z.number().min(0).max(360),
  /** Brand chroma intensity (0.04 = muted, 0.15 = vivid) */
  brandChroma: z.number().min(0.02).max(0.2).default(0.12),
  /** Surface/neutral hue (80 = warm gray, 240 = cool gray) */
  surfaceHue: z.number().min(0).max(360).default(80),
  /** Surface chroma (0 = pure gray, 0.01+ = tinted) */
  surfaceChroma: z.number().min(0).max(0.03).default(0.006),
  /** Which brand step to use as accent */
  accentStep: z.enum(["400", "500", "600", "700"]).default("600"),
  /** Separate accent hue (OKLCH, 0-360). When set, accent is NOT derived from brand ramp */
  accentHue: z.number().min(0).max(360).optional(),
  /** Accent chroma (used only when accentHue is set) */
  accentChroma: z.number().min(0.02).max(0.25).optional(),
});

// --- Typography ---

export const typographyConfigSchema = z.object({
  /** Body font family */
  fontSans: z.string().default("Plus Jakarta Sans"),
  /** Display/heading font (can differ from body) */
  fontDisplay: z.string().default("Plus Jakarta Sans"),
  /** Font provider for @nuxt/fonts */
  fontProvider: z.enum(["google", "local", "bunny"]).default("google"),
  /** Font weights to load */
  fontWeights: z.array(z.number()).default([400, 500, 600, 700]),
  /** Base font size scale factor (1 = 16px) */
  fontScale: z.number().min(0.85).max(1.2).default(1),
});

// --- Style ---

export const styleConfigSchema = z.object({
  /** Border radius: sharp (2px), soft (8px), round (16px+) */
  radiusProfile: z.enum(["sharp", "soft", "round"]).default("soft"),
  /** Shadow intensity */
  shadowProfile: z.enum(["none", "subtle", "medium", "dramatic"]).default("subtle"),
  /** Visual density: airy = more whitespace, compact = less */
  density: z.enum(["airy", "balanced", "compact"]).default("balanced"),
  /** Container max width in px */
  containerMax: z.number().min(960).max(1600).default(1280),
});

// --- Animation ---

export const animationConfigSchema = z.object({
  /** Overall intensity: none skips all, expressive = large moves */
  intensity: z.enum(["none", "subtle", "moderate", "expressive"]).default("moderate"),
  /** Physics feel: snappy (stiff spring), smooth (gentle), bouncy */
  feel: z.enum(["snappy", "smooth", "bouncy"]).default("smooth"),
  /** Stagger delay between children (seconds) */
  staggerDelay: z.number().min(0.02).max(0.2).default(0.08),
  /** Enable scroll-linked parallax on hero sections */
  parallax: z.boolean().default(true),
  /** Respect prefers-reduced-motion */
  respectReducedMotion: z.boolean().default(true),
});

// --- Full ThemeConfig ---

export const themeConfigSchema = z.object({
  name: z.string().min(1),
  colors: colorConfigSchema,
  typography: typographyConfigSchema,
  style: styleConfigSchema,
  animation: animationConfigSchema,
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type ColorConfig = z.infer<typeof colorConfigSchema>;
export type TypographyConfig = z.infer<typeof typographyConfigSchema>;
export type StyleConfig = z.infer<typeof styleConfigSchema>;
export type AnimationConfig = z.infer<typeof animationConfigSchema>;
