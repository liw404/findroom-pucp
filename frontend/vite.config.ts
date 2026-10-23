import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  server: {
    port: 5173,
    // @ts-expect-error Propiedad de compatibilidad SPA history fallback
    historyApiFallback: true,
  },
});
