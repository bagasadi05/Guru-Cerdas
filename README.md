# 📚 Portal Guru

<div align="center">

![Portal Guru Logo](public/icons/icon-192x192.png)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

**Aplikasi manajemen sekolah modern untuk guru Indonesia**

[Demo](#demo) · [Fitur](#-fitur-utama) · [Instalasi](#-instalasi) · [Dokumentasi](#-dokumentasi) · [Kontribusi](#-kontribusi)

</div>

---

## 📖 Deskripsi

Portal Guru adalah aplikasi manajemen sekolah modern yang dirancang khusus untuk memudahkan guru dalam:
- 📝 Mencatat kehadiran siswa secara real-time
- 📊 Memantau perkembangan akademik dan perilaku
- 💬 Berkomunikasi langsung dengan orang tua
- 📅 Mengelola jadwal dan tugas harian

Aplikasi ini dibangun dengan teknologi web modern dan mendukung fitur **Progressive Web App (PWA)** untuk penggunaan offline.

---

## ✨ Fitur Utama

### 📱 Manajemen Kelas & Absensi
- **Absensi Real-time**: Catat kehadiran (Hadir, Izin, Sakit, Alpha) dengan antarmuka yang cepat dan intuitif
- **Dukungan Offline (PWA)**: Tetap produktif tanpa koneksi internet. Data akan disinkronkan otomatis saat online
- **Jadwal Pelajaran**: Tampilan jadwal mingguan yang responsif dengan notifikasi pengingat

### 📊 Analisis & Laporan
- **Dashboard Interaktif**: Ringkasan statistik kehadiran dan performa kelas dalam satu pandangan
- **AI Insights**: Wawasan cerdas tentang pola kehadiran dan perilaku siswa menggunakan AI
- **Cetak Rapor**: Generate rapor hasil belajar siswa dalam format PDF siap cetak
- **Grade Audit**: Identifikasi kelengkapan nilai siswa per mata pelajaran

### 👨‍👩‍👧‍👦 Portal Orang Tua & Siswa
- **Akses Khusus**: Orang tua dapat memantau kehadiran, nilai, dan pelanggaran menggunakan kode akses unik
- **Komunikasi Dua Arah**: Fitur pesan terintegrasi antara guru dan orang tua
- **Transparansi**: Lihat catatan pelanggaran dan poin keaktifan secara real-time

### 🎮 Gamifikasi
- **Poin & Badge**: Sistem poin untuk mendorong partisipasi siswa
- **Leaderboard**: Papan peringkat kelas berdasarkan performa akademik

### ⚙️ Personalisasi
- **Profil Guru**: Kelola data diri dan nama sekolah
- **Tema & Tampilan**: Dukungan Dark Mode dan kustomisasi antarmuka
- **Notifikasi**: Pengatur jadwal notifikasi dengan suara kustom

---

## 🛠️ Tech Stack

### Frontend
| Teknologi | Fungsi |
|-----------|--------|
| [React 18](https://react.dev/) | UI Library |
| [TypeScript](https://www.typescriptlang.org/) | Type Safety |
| [Vite](https://vitejs.dev/) | Build Tool |
| [React Router](https://reactrouter.com/) | Routing |
| [TanStack Query](https://tanstack.com/query) | Data Fetching & Caching |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

### Backend
| Teknologi | Fungsi |
|-----------|--------|
| [Supabase](https://supabase.com/) | Database (PostgreSQL) |
| [Supabase Auth](https://supabase.com/auth) | Authentication |
| [Supabase Realtime](https://supabase.com/realtime) | Real-time Updates |

### AI & Utilities
| Teknologi | Fungsi |
|-----------|--------|
| [OpenRouter API](https://openrouter.ai/) | AI Insights |
| [jsPDF](https://github.com/parallax/jsPDF) | PDF Generation |
| [xlsx](https://sheetjs.com/) | Excel Export |

### PWA & Mobile
| Teknologi | Fungsi |
|-----------|--------|
| [Vite PWA](https://vite-pwa-org.netlify.app/) | Service Worker |
| [Workbox](https://developer.chrome.com/docs/workbox) | Offline Caching |
| [Capacitor](https://capacitorjs.com/) | Native Features |

---

## 📦 Instalasi

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 atau **pnpm**
- Akun [Supabase](https://supabase.com/)
- API Key [OpenRouter](https://openrouter.ai/) (opsional, untuk fitur AI via proxy)

### Quick Start

1. **Clone repositori**
   ```bash
   git clone https://github.com/your-username/portal-guru.git
   cd portal-guru
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi environment variables**
   
   Buat file `.env` di root direktori:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Recommended: use server-side proxy in production
   VITE_OPENROUTER_PROXY_URL=https://your-domain.vercel.app/api/openrouter
   # Local-only fallback (avoid in production)
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   ```
   Untuk proxy (Vercel), set environment variable server-side:
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_ALLOWED_ORIGIN` (opsional)

4. **Setup database**
   
   Jalankan migrations di Supabase Dashboard atau menggunakan Supabase CLI:
   ```bash
   supabase db push
   ```

5. **Jalankan development server**
   ```bash
   npm run dev
   ```
   
   Akses di `http://localhost:5173`

---

## 📁 Struktur Proyek

```
portal-guru/
├── docs/                    # Dokumentasi proyek
│   ├── DESIGN_STANDARDS.md  # Standar desain UI/UX
│   └── TECHNICAL_IMPROVEMENTS.md
├── public/                  # Static assets
│   └── icons/               # PWA icons
├── src/
│   ├── components/          # React components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── gamification/    # Gamification components
│   │   ├── pages/           # Page components
│   │   ├── skeletons/       # Loading skeletons
│   │   ├── students/        # Student-related components
│   │   └── ui/              # Reusable UI components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   │   └── queryKeys.ts     # React Query key factory
│   ├── services/            # API & external services
│   │   ├── database.types.ts
│   │   ├── supabase.ts
│   │   └── ...
│   ├── styles/              # Global styles & design system
│   ├── types/               # TypeScript type definitions
│   │   ├── index.ts         # Type exports
│   │   ├── database.ts      # Database types
│   │   ├── api.ts           # API types
│   │   ├── components.ts    # Component props
│   │   └── enums.ts         # Enum definitions
│   ├── utils/               # Utility functions
│   └── workers/             # Web Workers
├── .env.example             # Environment variable template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
```

---

## 📱 Build & Deploy

### Build untuk Production
```bash
npm run build
```

Output akan berada di folder `dist/`.

### Build APK (Android)
```bash
# Sync dengan Capacitor
npx cap sync android

# Build APK
cd android && ./gradlew assembleRelease
```

### Preview Production Build
```bash
npm run preview
```

---

## 📚 Dokumentasi

- [🎨 Design Standards](docs/DESIGN_STANDARDS.md) - Panduan desain UI/UX
- [🔧 Technical Improvements](docs/TECHNICAL_IMPROVEMENTS.md) - Rencana perbaikan teknis
- [📖 VitePress Docs](docs/.vitepress/) - Dokumentasi lengkap (coming soon)

### API Reference

Aplikasi ini menggunakan Supabase sebagai backend. Schema database dapat dilihat di:
- `src/services/database.types.ts` - Auto-generated types
- Supabase Dashboard > Database > Schema

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan fork repositori ini dan buat pull request.

### Development Guidelines

1. **Code Style**
   - Gunakan TypeScript strict mode
   - Ikuti ESLint dan Prettier config
   - Tulis JSDoc untuk semua public functions

2. **Commit Convention**
   ```
   feat: add new feature
   fix: fix bug
   docs: update documentation
   style: formatting changes
   refactor: code refactoring
   test: add tests
   chore: maintenance
   ```

3. **Branch Naming**
   ```
   feature/add-new-widget
   fix/attendance-sync-issue
   docs/update-readme
   ```

### Reporting Issues

Gunakan [GitHub Issues](https://github.com/your-username/portal-guru/issues) untuk melaporkan bug atau request fitur baru.

---

## 📄 Lisensi

[MIT License](LICENSE) - Bebas digunakan untuk keperluan pribadi dan komersial.

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) untuk database dan authentication
- [Tailwind CSS](https://tailwindcss.com/) untuk styling
- [Lucide Icons](https://lucide.dev/) untuk icon set
- Komunitas React Indonesia

---

<div align="center">

**Made with ❤️ for Indonesian Teachers**

[⬆ Kembali ke Atas](#-portal-guru)

</div>
