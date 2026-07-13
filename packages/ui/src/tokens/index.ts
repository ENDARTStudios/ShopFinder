/**
 * @workspace/ui/tokens
 *
 * Design tokens — the single source of truth for the visual language.
 * Tokens are consumed by primitives and domain components via CSS variables
 * (defined in apps/web/src/app/globals.css) and TypeScript constants (here).
 *
 * Token layers:
 *   - Color     : semantic + palette (light/dark via CSS vars)
 *   - Typography: font families, sizes, weights, line heights
 *   - Spacing   : 4px base scale
 *   - Radius    : border radii
 *   - Shadow    : elevation
 *   - Z-index   : stacking order
 *   - Motion    : durations + easings
 */

// ── Color (semantic — resolved via CSS vars at runtime) ─────
export const colorTokens = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  cardForeground: "var(--card-foreground)",
  popover: "var(--popover)",
  popoverForeground: "var(--popover-foreground)",
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  secondary: "var(--secondary)",
  secondaryForeground: "var(--secondary-foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  accent: "var(--accent)",
  accentForeground: "var(--accent-foreground)",
  destructive: "var(--destructive)",
  destructiveForeground: "var(--destructive-foreground)",
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",
  // E-commerce semantics
  success: "var(--success, oklch(0.646 0.222 41.116))",
  successForeground: "var(--success-foreground, oklch(0.985 0 0))",
  warning: "var(--warning, oklch(0.769 0.188 70.08))",
  warningForeground: "var(--warning-foreground, oklch(0.145 0 0))",
  info: "var(--info, oklch(0.6 0.118 184.704))",
  infoForeground: "var(--info-foreground, oklch(0.985 0 0))",
  // Chart palette
  chart: {
    1: "var(--chart-1)",
    2: "var(--chart-2)",
    3: "var(--chart-3)",
    4: "var(--chart-4)",
    5: "var(--chart-5)"
  }
} as const;

// ── Typography ──────────────────────────────────────────────
export const fontTokens = {
  family: {
    sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, monospace",
    serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif"
  },
  size: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
    "6xl": "3.75rem" // 60px
  },
  weight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800"
  },
  lineHeight: {
    tight: "1.2",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2"
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em"
  }
} as const;

// ── Spacing (4px base) ──────────────────────────────────────
export const spacingTokens = {
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem", // 8px
  3: "0.75rem", // 12px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  8: "2rem", // 32px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  32: "8rem" // 128px
} as const;

// ── Radius ──────────────────────────────────────────────────
export const radiusTokens = {
  none: "0",
  sm: "calc(var(--radius) - 4px)",
  md: "calc(var(--radius) - 2px)",
  lg: "var(--radius)",
  xl: "calc(var(--radius) + 4px)",
  "2xl": "calc(var(--radius) + 8px)",
  full: "9999px"
} as const;

// ── Shadow (elevation) ──────────────────────────────────────
export const shadowTokens = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)"
} as const;

// ── Z-index ─────────────────────────────────────────────────
export const zIndexTokens = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  dialog: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700
} as const;

// ── Motion ──────────────────────────────────────────────────
export const motionTokens = {
  duration: {
    instant: "0ms",
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    slower: "600ms"
  },
  easing: {
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  }
} as const;

// ── Breakpoints (matches Tailwind defaults) ─────────────────
export const breakpointTokens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px"
} as const;

// ── Commerce-specific tokens ────────────────────────────────
export const commerceTokens = {
  priceColor: "var(--foreground)",
  compareAtPriceColor: "var(--muted-foreground)",
  saleBadgeBg: "var(--destructive)",
  saleBadgeFg: "var(--destructive-foreground)",
  stockInStock: "var(--success, oklch(0.646 0.222 41.116))",
  stockLowStock: "var(--warning, oklch(0.769 0.188 70.08))",
  stockOutOfStock: "var(--destructive)",
  ratingStarFilled: "var(--warning, oklch(0.769 0.188 70.08))",
  ratingStarEmpty: "var(--muted)"
} as const;

export const tokens = {
  color: colorTokens,
  font: fontTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadow: shadowTokens,
  zIndex: zIndexTokens,
  motion: motionTokens,
  breakpoint: breakpointTokens,
  commerce: commerceTokens
} as const;
