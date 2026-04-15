const path = require("node:path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  publicDir: false,
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, "src/main.js"),
      formats: ["iife"],
      name: "ExamplePlaycanvas",
      fileName: () => "game.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
