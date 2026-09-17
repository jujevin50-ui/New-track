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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "Trading Journal",
        short_name: "TradingJournal",
        description: "Journal de trading professionnel",
        version: "2",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#7c3aed",
        icons: [
          { src: "/icons/favicon-16.png",       sizes: "16x16",   type: "image/png" },
          { src: "/icons/favicon-32.png",       sizes: "32x32",   type: "image/png" },
          { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
          { src: "/icons/icon-192x192.png",     sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512x512.png",     sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512x512.png",     sizes: "512x512", type: "image/png", purpose: "maskable" },
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
