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
        globIgnores: ['**/Admin*.js', '**/ProtectedRoute*.js'],
        runtimeCaching: [
          // Station list — network-first with cache fallback for offline
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/stations(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'station-list',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Station detail / data endpoints — network-first with cache fallback
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/stations\/.+/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'station-data',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Webcam list
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/webcams(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'webcam-list',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Webcam detail / images endpoints
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/webcams\/.+/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'webcam-data',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Webcam images from file server
          {
            urlPattern: /^https:\/\/fs(\.test)?\.zephyrapp\.nz\/.+/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'webcam-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Sites
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/sites(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'site-list',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Site detail endpoints
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/sites\/.+/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'site-data',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Landings
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/landings(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'landing-list',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
            }
          },
          // Landing detail endpoints
          {
            urlPattern: /^https:\/\/api(\.test)?\.zephyrapp\.nz\/landings\/.+/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'landing-data',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              },
              cacheableResponse: { statuses: [200] }
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
