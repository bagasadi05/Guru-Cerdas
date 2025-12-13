import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isAnalyze = process.env.ANALYZE === 'true';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        manifest: {
          name: "Portal Guru - Manajemen Kelas & Siswa",
          short_name: "Portal Guru",
          description: "Aplikasi manajemen kelas, siswa, dan absensi untuk guru modern. Bekerja offline dan real-time.",
          start_url: "/",
          display: "standalone",
          background_color: "#f8fafc", // slate-50
          theme_color: "#4f46e5", // indigo-600
          orientation: "portrait",
          lang: "id",
          categories: ["education", "productivity", "utilities"],
          icons: [
            {
              src: "/logo.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable"
            },
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      // Enable source maps for debugging
      sourcemap: mode !== 'production',
      // Rollup options for optimization
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks - core React
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // UI libraries
            'vendor-ui': ['framer-motion', '@tanstack/react-query'],
            // Utility libraries
            'vendor-utils': ['zod', 'date-fns'],
            // Icons (heavy)
            'vendor-icons': ['lucide-react'],
            // Supabase
            'vendor-supabase': ['@supabase/supabase-js'],
            // Heavy export libraries (lazy loaded)
            'vendor-export': ['xlsx', 'jspdf', 'jspdf-autotable', 'html2canvas'],
            // Capacitor plugins
            'vendor-capacitor': [
              '@capacitor/app',
              '@capacitor/haptics',
              '@capacitor/keyboard',
              '@capacitor/local-notifications',
              '@capacitor/network',
              '@capacitor/splash-screen',
              '@capacitor/status-bar'
            ],
          },
          // Asset naming for cache busting
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|ttf|eot|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      // Chunk size warning limit
      chunkSizeWarningLimit: 500,
      // Minification options
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts',
    }
  };
});
