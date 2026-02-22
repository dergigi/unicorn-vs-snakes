import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: [
          "**/*.{js,css,html}",
          "assets/sprites/**/*.png",
          "levels/*.json",
        ],
      },
      manifest: {
        name: "Unicorn vs Snakes",
        short_name: "UvS",
        description: "Collect sparkles, dodge snakes, reach the rainbow gate!",
        start_url: "/",
        display: "fullscreen",
        orientation: "landscape",
        background_color: "#1d1336",
        theme_color: "#1d1336",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  server: {
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
