import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
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
          theme_color: "#10b981", // emerald-500
          orientation: "portrait",
          lang: "id",
          categories: ["education", "productivity", "utilities"],
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "/logo.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        },
        injectManifest: {
          // Keep the offline shell small. Route chunks, export libraries, and
          // tutorial images are cached at runtime only when the user opens them.
          globPatterns: [
            'index.html',
            'manifest.webmanifest',
            'assets/index-*.css',
            'assets/fonts/*.{woff,woff2}',
            'assets/js/index-*.js',
            'assets/js/vendor-react-*.js',
            'assets/js/vendor-ui-*.js',
            'assets/js/vendor-utils-*.js',
            'assets/js/vendor-icons-*.js',
            'assets/js/vendor-supabase-*.js',
            'assets/js/workbox-window*.js',
            'logo.svg',
            'pwa-192x192.png',
            'pwa-512x512.png',
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          enabled: false,
        }
      }),
      // Bundle analyzer (only in analyze mode)
      isAnalyze && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
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
            // Charts
            'vendor-charts': ['recharts'],
            // PDF/Excel export libs
            'vendor-export': ['jspdf', 'jspdf-autotable', 'html2canvas', 'exceljs'],
            // Utility libraries
            'vendor-utils': ['zod', 'date-fns'],
            // Icons (heavy)
            'vendor-icons': ['lucide-react'],
            // Supabase
            'vendor-supabase': ['@supabase/supabase-js'],
            // Sentry
            'vendor-sentry': ['@sentry/react'],
            // Forms
            'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
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
      // Chunk size warning limit (increased to accommodate heavy export modules when loading on demand)
      chunkSizeWarningLimit: 1500,
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
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'framer-motion',
        'lucide-react',
        'recharts',
        'exceljs',
        'jspdf',
        'jspdf-autotable',
        'zod',
        'date-fns',
        'react-hook-form',
        '@hookform/resolvers'
      ],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      exclude: ['node_modules', 'dist', '.git', '.cache', 'e2e/**', 'tests/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        // Real baseline measured on 2026-06-17 (commit 1a1a7fe7, post DS8).
        // Coverage is dominated by Supabase services (mocked) and integration-heavy
        // pages. The thresholds below are intentionally AT baseline so the gate
        // stays green while still alerting on catastrophic regressions (e.g. a
        // file that drops below the buffer). Future sprints should raise these
        // as integration tests are added — see docs/COVERAGE_BASELINE.md.
        thresholds: {
          lines: 8,
          functions: 6,
          branches: 5,
          statements: 8,
        },
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.stories.{ts,tsx}',
          'src/setupTests.ts',
          'src/vite-env.d.ts',
          'src/types/**',
          'src/services/database.types.ts',
          // Icon definitions are pure SVG passthrough; no testable behavior.
          'src/components/Icons.tsx',
          // Animation/visual primitives that need a browser harness.
          'src/utils/animations.ts',
          'src/utils/confetti.ts',
          // Service worker source (compiled separately by Workbox).
          'src/sw.js',
        ],
      },
    }
  };
});
