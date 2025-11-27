import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // With a custom domain, the app is served from the root, not a subdirectory.
  base: '/',
  server: {
    proxy: {
      '/webdav': {
        target: 'https://dav.jianguoyun.com/dav/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/webdav/, ''),
        secure: false, 
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Jianguoyun expects the Host header to match the target
            proxyReq.setHeader('Host', 'dav.jianguoyun.com');
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})