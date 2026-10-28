import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://liumoazed.github.io/world-view-made-ez/ on GitHub Pages.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/world-view-made-ez/' : '/',
  plugins: [react()],
}));
