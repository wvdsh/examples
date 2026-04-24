import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
  base: './',
  logLevel: 'warn',
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    minify: 'esbuild'
  }
});
