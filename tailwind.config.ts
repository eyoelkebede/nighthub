import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          bg: "#050505",
          surface: "#0A0A0A",
          border: "#1F1F1F",
        },
        neon: {
          blue: "#00F0FF",
          purple: "#BC13FE",
          green: "#0AFF00",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass": "linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
        "glass-dark": "linear-gradient(180deg, rgba(20, 20, 20, 0.6) 0%, rgba(20, 20, 20, 0.4) 100%)",
      },
      backdropBlur: {
        xs: "2px",
        md: "12px",
        lg: "24px",
        xl: "40px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
