import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative base so the app works when served from a subfolder (e.g., GitHub Pages /repo/) 
export default defineConfig({
  base: './',
  plugins: [react()],
});
