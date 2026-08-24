/**
 * Design tokens shared across the app.
 *
 * The web build gets these from Tailwind; React Native has no stylesheet
 * cascade, so they live here and are imported wherever they're needed.
 */

export const colors = {
  brand: {
    50: "#eef7ff",
    100: "#d9edff",
    200: "#bce0ff",
    500: "#2e8fff",
    600: "#1a6ff5",
    700: "#1558e0",
    800: "#1846b5",
    900: "#193d8f",
  },
  ink: {
    900: "#0b1220",
    800: "#111a2e",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  white: "#ffffff",
  red: { 50: "#fef2f2", 200: "#fecaca", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 900: "#7f1d1d" },
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 500: "#10b981", 600: "#059669", 700: "#047857", 900: "#064e3b" },
  amber: { 50: "#fffbeb", 200: "#fde68a", 500: "#f59e0b", 800: "#92400e", 900: "#78350f" },
  orange: { 50: "#fff7ed", 500: "#f97316", 600: "#ea580c" },
  violet: { 50: "#f5f3ff", 500: "#8b5cf6", 600: "#7c3aed" },
} as const;

export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 999,
} as const;

export const text = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 21,
  "2xl": 26,
  "3xl": 32,
} as const;

/** iOS minimum recommended touch target. */
export const MIN_TOUCH = 44;

export const shadow = {
  card: {
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
} as const;
