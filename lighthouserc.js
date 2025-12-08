// Lighthouse CI Configuration
// Run: npx lhci autorun --config=lighthouserc.js

module.exports = {
    ci: {
        collect: {
            // URL to test
            url: ['http://localhost:5173/'],

            // Number of runs for consistency
            numberOfRuns: 3,

            // Start local server before testing
            startServerCommand: 'npm run preview',
            startServerReadyPattern: 'ready',
            startServerReadyTimeout: 30000,

            // Settings for the audit
            settings: {
                preset: 'desktop',
                // Chrome flags
                chromeFlags: '--no-sandbox --headless --disable-gpu',
                // Throttling settings
                throttlingMethod: 'simulate',
                // Categories to test
                onlyCategories: [
                    'performance',
                    'accessibility',
                    'best-practices',
                    'seo'
                ],
            },
        },

        assert: {
            // Assertions for CI/CD pipeline
            assertions: {
                // Performance
                'categories:performance': ['warn', { minScore: 0.8 }],
                'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
                'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
                'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
                'total-blocking-time': ['warn', { maxNumericValue: 300 }],
                'speed-index': ['warn', { maxNumericValue: 3000 }],

                // Accessibility
                'categories:accessibility': ['error', { minScore: 0.9 }],
                'color-contrast': 'warn',
                'image-alt': 'error',
                'label': 'error',

                // Best Practices
                'categories:best-practices': ['warn', { minScore: 0.9 }],
                'errors-in-console': 'warn',
                'deprecations': 'warn',

                // SEO
                'categories:seo': ['warn', { minScore: 0.9 }],
                'meta-description': 'warn',
                'document-title': 'error',
            },
        },

        upload: {
            // Upload results to temporary public storage
            target: 'temporary-public-storage',

            // Or upload to Lighthouse CI Server
            // target: 'lhci',
            // serverBaseUrl: 'https://your-lhci-server.example.com',
            // token: 'your-build-token',
        },
    },
};
