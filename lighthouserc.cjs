/**
 * Lighthouse CI configuration.
 *
 * Routes audited map to the real React Router paths defined in src/App.tsx.
 * Login and student detail have been mapped to their actual canonical paths.
 *
 * Thresholds:
 *   - accessibility >= 0.95 (error) — non-negotiable accessibility floor.
 *   - best-practices >= 0.90 (error) — must remain green.
 *   - seo >= 0.90 (error) — must remain green.
 *   - performance = warn — realistic budget; performance tuning is out of
 *     scope for the QA closure sprint.
 */

module.exports = {
  ci: {
    collect: {
      // Serve the production build via Vite preview (handles SPA history fallback).
      // --strictPort so LHCI can rely on the configured port.
      startServerCommand: 'npx vite preview --port 4173 --strictPort',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/guru-login',
        'http://localhost:4173/dashboard',
        'http://localhost:4173/siswa',
        'http://localhost:4173/cetak-rapot/1',
      ],
      numberOfRuns: 3,
      // Allow time for Vite preview to spin up before LHCI starts auditing.
      serverStartupTimeout: 60000,
      settings: {
        // Use the pre-installed Chrome instead of ChromeLauncher trying to find one.
        chromePath: process.env.CHROME_PATH || undefined,
        // Desktop audit so we measure the actual SPA bundle, not mobile throttling.
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        onlyCategories: ['accessibility', 'best-practices', 'performance', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
