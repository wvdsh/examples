import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  logLevel: 'warn',
  build: {
    target: 'esnext',
    minify: 'esbuild'
  }
});
