import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // With a custom domain, the app is served from the root, not a subdirectory.
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})