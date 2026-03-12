/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          300: "hsl(222, 80%, 68%)",
          400: "hsl(222, 80%, 58%)",
          500: "hsl(222, 80%, 48%)",
          600: "hsl(222, 80%, 38%)",
          700: "hsl(222, 80%, 32%)",
        },
        accent: {
          400: "hsl(190, 80%, 50%)",
          500: "hsl(190, 80%, 40%)",
        },
        success: {
          400: "hsl(145, 63%, 52%)",
          500: "hsl(145, 63%, 42%)",
        },
        warning: {
          400: "hsl(32, 95%, 60%)",
          500: "hsl(32, 95%, 50%)",
        },
        danger: {
          400: "hsl(0, 72%, 61%)",
          500: "hsl(0, 72%, 51%)",
        },
        caution: {
          400: "hsl(48, 96%, 63%)",
          500: "hsl(48, 96%, 53%)",
        },
        info: {
          400: "hsl(210, 70%, 65%)",
          500: "hsl(210, 70%, 55%)",
        },
        // Superficies
        surface: {
          base: "var(--surface-base, hsl(222, 22%, 8%))",
          default: "var(--surface-default, hsl(222, 22%, 11%))",
          elevated: "var(--surface-elevated, hsl(222, 22%, 14%))",
          card: "var(--surface-card, hsl(222, 22%, 16%))",
          sidebar: "var(--surface-sidebar, hsl(222, 24%, 10%))",
          hover: "var(--surface-hover, hsl(222, 22%, 19%))",
        },
        border: {
          subtle: "var(--border-subtle, hsl(222, 22%, 22%))",
          strong: "var(--border-strong, hsl(222, 22%, 30%))",
        },
        ink: {
          primary: "var(--ink-primary, hsl(0, 0%, 95%))",
          secondary: "var(--ink-secondary, hsl(0, 0%, 75%))",
          muted: "var(--ink-muted, hsl(0, 0%, 55%))",
        },
      },
      width: {
        sidebar: "240px",
      },
      spacing: {
        sidebar: "240px",
      },
      fontSize: {
        xxs: "11px",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out forwards",
        "slide-up": "slideUp 250ms ease-out forwards",
        "slide-down": "slideDown 250ms ease-out forwards",
        "pulse-dot": "pulseDot 1.2s infinite ease-in-out",
        "spin-fast": "spin 0.8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(0.8)", opacity: "0.5" },
        },
      },
      boxShadow: {
        "brand-glow":
          "0 0 15px -3px var(--tw-shadow-color, hsl(222, 80%, 48%))",
      },
    },
  },
  plugins: [],
};
