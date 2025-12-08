---
layout: home

hero:
  name: Portal Guru
  text: Dokumentasi Lengkap
  tagline: Panduan untuk pengembang yang ingin memahami dan berkontribusi pada Portal Guru
  image:
    src: /logo.png
    alt: Portal Guru Logo
  actions:
    - theme: brand
      text: Mulai Sekarang
      link: /guides/getting-started
    - theme: alt
      text: Lihat di GitHub
      link: https://github.com/your-org/portal-guru

features:
  - icon: 🚀
    title: Quick Start
    details: Mulai development dalam 5 menit dengan panduan setup yang mudah diikuti.
    link: /guides/getting-started
    
  - icon: 📖
    title: API Reference
    details: Dokumentasi lengkap untuk semua services, hooks, dan utilities.
    link: /api/
    
  - icon: 🏗️
    title: Architecture
    details: Memahami arsitektur sistem, data flow, dan pola desain yang digunakan.
    link: /architecture/overview
    
  - icon: 🔒
    title: Security
    details: Pelajari implementasi keamanan termasuk autentikasi dan RLS.
    link: /architecture/security
    
  - icon: 📱
    title: PWA & Offline
    details: Strategi offline-first untuk Progressive Web App.
    link: /architecture/offline-sync
    
  - icon: 🧪
    title: Testing
    details: Panduan menulis unit test, integration test, dan property-based test.
    link: /guides/testing
---

## Navigasi Cepat

<div class="quick-nav">

### 📚 Untuk Developer Baru
- [Getting Started](/guides/getting-started) - Setup development environment
- [Contributing](/guides/contributing) - Panduan kontribusi
- [Architecture Overview](/architecture/overview) - Memahami sistem

### 🔧 Referensi Teknis
- [Database Schema](/api/database/tables) - Struktur database
- [Data Flow](/architecture/data-flow) - Aliran data
- [API Reference](/api/) - Dokumentasi API

### 🚀 Deployment
- [Deployment Guide](/guides/deployment) - Deploy ke production
- [Troubleshooting](/guides/troubleshooting) - Solusi masalah umum

</div>

<style>
.quick-nav {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.quick-nav h3 {
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--vp-c-brand);
}

.quick-nav ul {
  list-style: none;
  padding: 0;
}

.quick-nav li {
  margin: 0.5rem 0;
}

.quick-nav a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.quick-nav a:hover {
  color: var(--vp-c-brand);
}
</style>
