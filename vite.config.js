import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(), // ✅ Ensures JSX is parsed correctly
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      manifest: {
        name: 'DomusEA',
        short_name: 'DomusEA',
        theme_color: '#4F46E5',
        background_color: '#F8FAFC',
        display: 'standalone'
      }
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});