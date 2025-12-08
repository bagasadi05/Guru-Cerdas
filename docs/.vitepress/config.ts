import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Portal Guru",
    description: "Dokumentasi lengkap untuk Portal Guru - Aplikasi manajemen kelas untuk guru Indonesia",

    // Base URL (update for deployment)
    // base: '/portal-guru-docs/',

    // Force dark mode to match main app
    appearance: 'dark',

    // Theme configuration
    themeConfig: {
        logo: '/logo.png',

        // Navigation
        nav: [
            { text: 'Beranda', link: '/' },
            { text: 'Panduan', link: '/guides/getting-started' },
            { text: 'API', link: '/api/' },
            { text: 'Arsitektur', link: '/architecture/overview' },
            {
                text: 'Lainnya',
                items: [
                    { text: 'Storybook', link: '/storybook/' },
                    { text: 'GitHub', link: 'https://github.com/your-org/portal-guru' }
                ]
            }
        ],

        // Sidebar navigation
        sidebar: {
            '/guides/': [
                {
                    text: 'Panduan',
                    items: [
                        { text: 'Memulai', link: '/guides/getting-started' },
                        { text: 'Kontribusi', link: '/guides/contributing' },
                        { text: 'Deployment', link: '/guides/deployment' },
                        { text: 'Testing', link: '/guides/testing' },
                        { text: 'Troubleshooting', link: '/guides/troubleshooting' }
                    ]
                }
            ],
            '/architecture/': [
                {
                    text: 'Arsitektur',
                    items: [
                        { text: 'Overview', link: '/architecture/overview' },
                        { text: 'Data Flow', link: '/architecture/data-flow' },
                        { text: 'Security', link: '/architecture/security' },
                        { text: 'Offline Sync', link: '/architecture/offline-sync' }
                    ]
                }
            ],
            '/api/': [
                {
                    text: 'API Reference',
                    items: [
                        { text: 'Overview', link: '/api/' },
                        {
                            text: 'Database',
                            items: [
                                { text: 'Tables', link: '/api/database/tables' }
                            ]
                        }
                    ]
                }
            ]
        },

        // Social links
        socialLinks: [
            { icon: 'github', link: 'https://github.com/your-org/portal-guru' }
        ],

        // Search
        search: {
            provider: 'local',
            options: {
                translations: {
                    button: {
                        buttonText: 'Cari...',
                        buttonAriaLabel: 'Cari'
                    },
                    modal: {
                        displayDetails: 'Tampilkan detail',
                        resetButtonTitle: 'Reset pencarian',
                        backButtonTitle: 'Kembali',
                        noResultsText: 'Tidak ada hasil untuk',
                        footer: {
                            selectText: 'pilih',
                            navigateText: 'navigasi',
                            closeText: 'tutup'
                        }
                    }
                }
            }
        },

        // Footer
        footer: {
            message: 'Dibuat dengan ❤️ untuk guru Indonesia',
            copyright: 'Copyright © 2024 Portal Guru'
        },

        // Edit link
        editLink: {
            pattern: 'https://github.com/your-org/portal-guru/edit/main/docs/:path',
            text: 'Edit halaman ini di GitHub'
        },

        // Last updated
        lastUpdated: {
            text: 'Terakhir diperbarui',
            formatOptions: {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        },

        // Outline
        outline: {
            label: 'Di halaman ini',
            level: [2, 3]
        },

        // Doc footer
        docFooter: {
            prev: 'Sebelumnya',
            next: 'Selanjutnya'
        },

        // Return to top
        returnToTopLabel: 'Kembali ke atas',

        // Dark mode
        darkModeSwitchLabel: 'Tampilan',
        sidebarMenuLabel: 'Menu',

        // Carbon ads (optional)
        // carbonAds: {
        //   code: 'your-carbon-code',
        //   placement: 'your-carbon-placement'
        // }
    },

    // Markdown configuration
    markdown: {
        lineNumbers: true,
        theme: {
            light: 'github-light',
            dark: 'github-dark'
        }
    },

    // Head tags
    head: [
        ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
        ['meta', { name: 'theme-color', content: '#0f172a' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:title', content: 'Portal Guru Documentation' }],
        ['meta', { property: 'og:description', content: 'Dokumentasi lengkap untuk Portal Guru' }]
    ],

    // Sitemap
    sitemap: {
        hostname: 'https://your-org.github.io/portal-guru-docs/'
    },

    // Ignore dead links during build (for development)
    ignoreDeadLinks: true
})
