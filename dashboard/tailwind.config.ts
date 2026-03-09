import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Teal/green — matches the right circle of the logo
        "clarita-green": {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        // Lilac/purple — matches the left circle of the logo
        "clarita-purple": {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        // Blue — accent for info/history
        "clarita-blue": {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
        },
        // Orange — accent for professionals section
        "clarita-orange": {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        // Pink — for gradients
        "clarita-pink": {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
        },
        // Neutral warm background
        "clarita-beige": {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.03)",
        "soft-lg":
          "0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
        "glow-green":
          "0 4px 20px -4px rgba(20, 184, 166, 0.2), 0 2px 8px -2px rgba(20, 184, 166, 0.1)",
        "glow-purple":
          "0 4px 20px -4px rgba(139, 92, 246, 0.2), 0 2px 8px -2px rgba(139, 92, 246, 0.1)",
        "glow-blue":
          "0 4px 20px -4px rgba(59, 130, 246, 0.2), 0 2px 8px -2px rgba(59, 130, 246, 0.1)",
        "glow-orange":
          "0 4px 20px -4px rgba(249, 115, 22, 0.2), 0 2px 8px -2px rgba(249, 115, 22, 0.1)",
        "glow-red":
          "0 4px 20px -4px rgba(239, 68, 68, 0.25), 0 2px 8px -2px rgba(239, 68, 68, 0.12)",
        "glow-yellow":
          "0 4px 20px -4px rgba(234, 179, 8, 0.2), 0 2px 8px -2px rgba(234, 179, 8, 0.1)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      animation: {
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        float: "float 3s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.05)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
