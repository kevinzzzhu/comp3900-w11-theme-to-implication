import { defineConfig } from 'vite';

// `--mode tutor` keeps src/tutor/* in the bundle; the default (student) build drops it entirely.
export default defineConfig(({ mode }) => ({
  define: { __TUTOR__: JSON.stringify(mode === 'tutor') },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
}));
