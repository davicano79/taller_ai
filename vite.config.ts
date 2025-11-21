import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  define: {
    // This handles the process.env.API_KEY variable safely in the client
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});