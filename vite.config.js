import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standard Vite + React setup. Nothing exotic — this exists so Netlify
// has something to run `npm run build` against. Output goes to /dist.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
