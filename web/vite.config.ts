import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev server proxies API calls to the NestJS app on :3000
const api = { target: 'http://localhost:3000', changeOrigin: true };

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': api,
      '/me': api,
      '/rewards': api,
      '/loyalty': api,
      '/health': api,
    },
  },
});
