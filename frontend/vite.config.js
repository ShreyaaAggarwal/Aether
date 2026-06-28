import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pure client-side SPA build. No SSR, no server middleware, no API routes.
// The dataStream.js engine is loaded as a raw script tag (see index.html) —
// it is NOT bundled, because the brief requires it to remain untouched and
// globally attached to window.initializeRpaStream.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});