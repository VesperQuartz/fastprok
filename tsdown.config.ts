import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  entry: ["src/**"],
  exports: true,
  dts: true,
  css: {
    fileName: "global.css",
  },
});
