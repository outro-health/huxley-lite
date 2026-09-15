import defaultTheme from "tailwindcss/defaultTheme"

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/client/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        sunken: "hsl(var(--sunken) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        "subtle-foreground": "hsl(var(--subtle-foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        hairline: "hsl(var(--hairline) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          hover: "hsl(var(--accent-hover) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          muted: "hsl(var(--success-muted) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          muted: "hsl(var(--warning-muted) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          muted: "hsl(var(--info-muted) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          muted: "hsl(var(--danger-muted) / <alpha-value>)",
          foreground: "hsl(var(--danger-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      fontSize: {
        xs: ["11.5px", { lineHeight: "1.4" }],
        sm: ["12.5px", { lineHeight: "1.4" }],
        base: ["13px", { lineHeight: "1.45" }],
        md: ["13.5px", { lineHeight: "1.4" }],
        lg: ["16px", { lineHeight: "1.3" }],
        xl: ["19px", { lineHeight: "1.2" }],
      },
    },
  },
  plugins: [],
}
