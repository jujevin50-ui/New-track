import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ["**/*.{js,mjs,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "Trading Journal",
        short_name: "TradingJournal",
        description: "Journal de trading professionnel",
        version: "8",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#7c3aed",
        icons: [
          { src: "/icons/favicon-16-transparent-7cc81a16b2.png", sizes: "16x16", type: "image/png" },
          { src: "/icons/favicon-32-transparent-c87b4e5128.png", sizes: "32x32", type: "image/png" },
          { src: "/icons/apple-touch-icon-transparent-ff56e60496.png", sizes: "180x180", type: "image/png" },
          { src: "/icons/app-logo-48-transparent-v8.png", sizes: "48x48", type: "image/png", purpose: "any" },
          { src: "/icons/app-logo-256-transparent-v8.png", sizes: "256x256", type: "image/png", purpose: "any" },
          { src: "/icons/app-logo-192-transparent-v8.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/app-logo-512-transparent-v8.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
