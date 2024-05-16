import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' })
  ],
  build: {
    emptyOutDir: true,
    outDir: './../../server/legacy/dist/http_server/web_gl',
    assetsDir: 'viewer',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      }}
  },
});
