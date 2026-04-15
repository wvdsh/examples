import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: false,
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["iife"],
      name: "ExampleTs",
      fileName: () => "game.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
