import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Use the existing manifest.json in public/ rather than generating one
      manifest: false,
      workbox: {
        // Precache all built assets (JS/CSS/HTML chunks)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Mapbox map tiles, fonts, and sprites — cache-first, kept for 7 days
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/(styles|fonts|v4|sprites)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-assets',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 7 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Mapbox GL JS tiles (raster/vector)
          {
            urlPattern: /^https:\/\/[a-z]\.tiles\.mapbox\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 7 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Station list — stale-while-revalidate; 1h TTL
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/stations(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'station-list',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Station detail / data endpoints — same 1h TTL
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/stations\/.+/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'station-data',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // Split vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['mapbox-gl'],
          'chart-vendor': ['recharts']
        }
      }
    },
    // Enable minification
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: false,
    cssCodeSplit: true,
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 500
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
