# Portal Guru Design Standards

## 📐 Panduan Konsistensi UI/UX

Dokumen ini mendefinisikan standar desain yang harus diikuti di seluruh aplikasi Portal Guru untuk memastikan konsistensi visual.

---

## 🎨 1. Border Radius

### Standar Penggunaan:
| Komponen | Tailwind Class | CSS Variable | Nilai |
|----------|----------------|--------------|-------|
| **Button** | `rounded-lg` | `--radius-button` | 8px |
| **Input/Form** | `rounded-lg` | `--radius-input` | 8px |
| **Card/Container** | `rounded-2xl` | `--radius-card` | 24px |
| **Modal/Dialog** | `rounded-3xl` | `--radius-modal` | 32px |
| **Badge/Tag** | `rounded-full` | `--radius-badge` | full |
| **Avatar** | `rounded-full` | `--radius-avatar` | full |
| **Dropdown** | `rounded-xl` | `--radius-dropdown` | 16px |
| **Page Section** | `rounded-2xl` | - | 24px |
| **Small Element** | `rounded-md` | - | 6px |

### ❌ Hindari:
- Menggunakan `rounded-lg` untuk card besar
- Mencampur `rounded-xl` dan `rounded-2xl` untuk elemen yang sama
- Menggunakan radius berbeda untuk tombol dalam satu halaman

---

## 📏 2. Spacing (Padding & Margin)

### Padding untuk Container:
| Ukuran Layar | Page Container | Card Padding | Section Padding |
|--------------|----------------|--------------|-----------------|
| **Mobile (< 640px)** | `p-3` atau `p-4` | `p-4` | `p-4` |
| **Tablet (640px - 1024px)** | `p-4` atau `p-6` | `p-5` | `p-6` |
| **Desktop (> 1024px)** | `p-6` atau `p-8` | `p-6` | `p-8` |

### Responsive Pattern yang Direkomendasikan:
```tsx
// Page Container
className="p-3 sm:p-4 md:p-6 lg:p-8"

// Card Internal Padding
className="p-4 sm:p-5 md:p-6"

// Section Spacing
className="space-y-4 sm:space-y-6 lg:space-y-8"

// Gap dalam Grid
className="gap-3 sm:gap-4 md:gap-6"
```

### Spacing Antar Elemen:
| Hubungan | Class | Penggunaan |
|----------|-------|------------|
| **Elemen sangat terkait** | `gap-1`, `space-y-1` | Label dengan input |
| **Elemen dalam grup** | `gap-2`, `space-y-2` | Item dalam list |
| **Elemen terpisah** | `gap-3`, `space-y-3` | Card dengan card |
| **Seksi berbeda** | `gap-4`, `space-y-4` | Section besar |
| **Section utama** | `gap-6`, `space-y-6` | Bagian halaman |

---

## 🎨 3. Warna & Gradient

### Primary Gradient (Standar):
```css
/* Button Primary */
bg-gradient-to-r from-indigo-600 to-purple-600

/* Header/Hero Section */
bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800

/* Card Highlight */
bg-gradient-to-br from-indigo-500/10 to-purple-500/10
```

### Status Colors:
| Status | Background Light | Background Dark | Text |
|--------|-----------------|-----------------|------|
| **Success** | `bg-emerald-50` | `bg-emerald-900/20` | `text-emerald-600` |
| **Warning** | `bg-amber-50` | `bg-amber-900/20` | `text-amber-600` |
| **Error** | `bg-rose-50` | `bg-rose-900/20` | `text-rose-600` |
| **Info** | `bg-blue-50` | `bg-blue-900/20` | `text-blue-600` |

### Gradient untuk Ikon/Badge:
```tsx
// Hadir (Success)
"from-emerald-500 to-green-600"

// Izin (Warning)  
"from-amber-500 to-orange-500"

// Sakit (Blue/Info)
"from-blue-500 to-cyan-500"

// Alpha (Danger)
"from-rose-500 to-red-600"

// Primary Action
"from-indigo-600 to-purple-600"
```

---

## 🃏 4. Card Styles

### Standard Card:
```tsx
className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
```

### Glass Card:
```tsx
className="glass-card rounded-2xl border border-white/20 dark:border-white/10"
```

### Interactive Card:
```tsx
className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
```

### Stat Card:
```tsx
className="glass-card rounded-2xl p-5 card-hover-glow border border-white/20 dark:border-white/5 shadow-lg"
```

---

## 🔘 5. Button Styles

### Size Variants:
| Size | Padding | Text | Height |
|------|---------|------|--------|
| **sm** | `px-3 py-1.5` | `text-sm` | ~32px |
| **default** | `px-4 py-2` | `text-sm` | ~40px |
| **lg** | `px-6 py-3` | `text-base` | ~48px |

### Common Button Patterns:
```tsx
// Primary CTA
className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/25 transition-all"

// Secondary
className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg transition-all"

// Ghost
className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-lg transition-all"

// Destructive
className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-rose-500/25 transition-all"
```

---

## 📱 6. Responsive Breakpoints

### Standar Breakpoints:
| Breakpoint | Prefix | Viewport |
|------------|--------|----------|
| **Mobile** | (default) | < 640px |
| **Tablet** | `sm:` | ≥ 640px |
| **Tablet Large** | `md:` | ≥ 768px |
| **Desktop** | `lg:` | ≥ 1024px |
| **Large Desktop** | `xl:` | ≥ 1280px |

### Layout Pattern:
```tsx
// Grid columns responsive
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"

// Flex to Grid switch
className="flex flex-col md:flex-row gap-4"

// Hide on mobile
className="hidden sm:block"

// Show only on mobile
className="block sm:hidden"
```

---

## 🎭 7. Animation Standards

### Durasi:
| Jenis | Durasi | Penggunaan |
|-------|--------|------------|
| **Instant** | `duration-0` | Tidak ada animasi |
| **Fast** | `duration-150` | Hover states |
| **Normal** | `duration-300` | Transitions umum |
| **Slow** | `duration-500` | Page transitions |

### Easing:
- Gunakan `ease-out` untuk masuk
- Gunakan `ease-in` untuk keluar
- Gunakan `ease-in-out` untuk loop

### Standard Transitions:
```tsx
// Hover effect
className="transition-all duration-300"

// Color change
className="transition-colors duration-200"

// Transform only
className="transition-transform duration-300"
```

---

## 📝 8. Typography

### Heading Hierarchy:
```tsx
// Page Title
className="text-2xl sm:text-3xl md:text-4xl font-bold"

// Section Title  
className="text-xl sm:text-2xl font-bold"

// Card Title
className="text-lg font-semibold"

// Subtitle
className="text-sm text-slate-500 dark:text-slate-400"

// Body Text
className="text-sm sm:text-base text-slate-700 dark:text-slate-300"

// Small/Caption
className="text-xs text-slate-500 dark:text-slate-400"
```

---

## ✅ Checklist Konsistensi

Sebelum commit, pastikan:

- [ ] Semua card menggunakan `rounded-2xl`
- [ ] Button menggunakan `rounded-lg`
- [ ] Gradient mengikuti standar `from-indigo-600 to-purple-600`
- [ ] Spacing responsif dengan pattern `p-3 sm:p-4 md:p-6`
- [ ] Semua transition menggunakan `duration-300`
- [ ] Dark mode di-handle untuk setiap komponen

---

## 🔧 Utility Classes Tersedia

Lihat `src/styles/designSystem.css` untuk utility classes yang sudah tersedia:

- `.glass-card` - Card dengan efek kaca
- `.card-hover-glow` - Efek glow saat hover
- `.btn-shine` - Efek shine pada tombol
- `.gradient-border` - Border dengan gradient
- `.text-gradient-primary` - Text dengan gradient

---

## 📱 9. Mobile UX Standards

### Touch Target Sizes:
| Elemen | Minimum Size | Tailwind Class |
|--------|-------------|----------------|
| **Buttons** | 44x44px | `min-h-[44px]` |
| **Icons** | 48x48px | `touch-target-lg` |
| **List Items** | 48px height | `min-h-[48px]` |

### CSS Classes Tersedia:
```css
/* Minimum touch target */
.touch-target { min-width: 44px; min-height: 44px; }
.touch-target-lg { min-width: 48px; min-height: 48px; }

/* Touch feedback */
.touch-feedback { transition: transform 0.15s; }
.touch-feedback:active { transform: scale(0.95); }

/* Safe area handling */
.safe-area-bottom { padding-bottom: max(env(safe-area-inset-bottom), 20px); }
.mobile-content-padding { padding-bottom: calc(68px + env(safe-area-inset-bottom)); }
```

### Modal Best Practices:
- Modal muncul dari bawah pada mobile (`items-end sm:items-center`)
- Max height 90vh untuk scroll capability
- Rounded corners hanya di atas pada mobile (`rounded-t-3xl sm:rounded-2xl`)
- Content area scrollable (`overflow-y-auto`)

### Keyboard Handling:
Gunakan hook `useKeyboardAwareness()` dari `src/utils/mobileUX.tsx`:
```tsx
import { useKeyboardAwareness } from '@/utils/mobileUX';

const { isKeyboardVisible, keyboardHeight } = useKeyboardAwareness();
```

### Loading States:
- Semua aksi async harus menampilkan loading indicator
- Gunakan skeleton loaders untuk initial content
- Gunakan `InlineLoading` component untuk inline loading

---

## ♿ 10. Accessibility Standards

### Contrast Ratio (WCAG AA):
| Tipe Teks | Minimum Ratio | CSS Class |
|-----------|--------------|-----------|
| **Normal text** | 4.5:1 | `text-accessible` |
| **Large text (18px+)** | 3:1 | - |
| **UI Components** | 3:1 | - |

### Aria Labels:
Gunakan utility dari `src/utils/accessibility.tsx`:
```tsx
import { ariaLabels, IconButton } from '@/utils/accessibility';

// Icon button with required label
<IconButton 
    icon={<EditIcon />} 
    label={ariaLabels.edit('siswa')} 
/>

// Manual aria-label
<button aria-label={ariaLabels.delete('data ini')}>
    <TrashIcon />
</button>
```

### Focus States:
```css
/* All elements use consistent focus ring */
:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
}
```

### Screen Reader Announcements:
```tsx
import { useAnnounce } from '@/utils/accessibility';

const announce = useAnnounce();
announce('Data berhasil disimpan'); // polite
announce('Error!', 'assertive'); // urgent
```

---

## 📭 11. Empty States

### Standard Empty State:
```tsx
import { EmptyStateWrapper } from '@/components/ui/StandardComponents';

<EmptyStateWrapper
    icon={<UsersIcon className="w-8 h-8" />}
    title="Belum ada data siswa"
    description="Mulai dengan menambahkan data siswa pertama Anda"
    action={<Button>Tambah Siswa</Button>}
/>
```

### Empty State dengan Steps (First-Time User):
```tsx
<EmptyStateWrapper
    icon={<ClipboardIcon className="w-8 h-8" />}
    title="Belum ada jadwal"
    description="Buat jadwal untuk mengatur waktu mengajar Anda"
    showHint
    hintText="Anda bisa menambah jadwal untuk setiap hari dalam seminggu"
    steps={[
        { number: 1, title: 'Klik tombol "Tambah Jadwal"' },
        { number: 2, title: 'Pilih hari dan jam' },
        { number: 3, title: 'Simpan jadwal Anda' }
    ]}
    action={<Button>Tambah Jadwal</Button>}
/>
```

### CSS Classes untuk Empty State:
```css
.empty-state - Container dengan border dashed
.empty-state-icon - Ikon container
.empty-state-title - Judul
.empty-state-description - Deskripsi
.first-time-hint - Box petunjuk
```

---

## ⚠️ 12. Error Handling Standards

### User-Friendly Error Messages:
Gunakan komponen dari `src/components/ui/EnhancedErrorDisplay.tsx`:
```tsx
import { InlineError, FullPageError, useErrorHandler } from '@/components/ui/EnhancedErrorDisplay';

// Inline error with retry
<InlineError 
    error={error} 
    onRetry={refetch}
    onDismiss={() => setError(null)}
/>

// Full page error
<FullPageError 
    error={error}
    onRetry={retry}
    onGoHome={() => navigate('/dashboard')}
/>
```

### Error Handler Hook:
```tsx
const { error, setError, clearError, retry, isRetrying } = useErrorHandler({
    onRetry: async () => await fetchData(),
    maxRetries: 3,
    autoRetry: true,
});
```

### Retry Mechanism:
- Semua network errors harus retryable
- Gunakan exponential backoff: 1s, 2s, 5s, 10s, 30s
- Tampilkan countdown ke user
- Maximum 5 retries default

### Technical Details:
- Technical errors HANYA ditampilkan di development mode
- Production mode menampilkan user-friendly messages only
- Error code tidak pernah ditampilkan ke user

---

## 🔄 13. Offline & Sync Standards

### Data Source Indicator:
```tsx
import { DataSourceIndicator } from '@/components/ui/OfflineIndicators';

<DataSourceIndicator 
    isFromCache={isFromCache}
    lastUpdated={lastUpdated}
    onRefresh={refetch}
    isRefreshing={isRefetching}
/>
```

### Sync Status Bar:
```tsx
import { SyncStatusBar } from '@/components/ui/OfflineIndicators';

<SyncStatusBar 
    status={syncStatus}
    pendingCount={pendingOps.length}
    failedCount={failedOps.length}
    lastSynced={lastSyncDate}
    onSync={forceSync}
    onRetryFailed={retryFailed}
/>
```

### Conflict Resolution:
```tsx
import { ConflictResolution } from '@/components/ui/OfflineIndicators';

<ConflictResolution
    conflicts={conflicts}
    entityName="Data Siswa"
    onResolve={handleResolve}
    onCancel={closeModal}
/>
```

### Stale Data Warning:
```tsx
import { StaleDataWarning } from '@/components/ui/OfflineIndicators';

<StaleDataWarning 
    lastUpdated={lastFetch}
    staleThresholdMinutes={30}
    onRefresh={refetch}
/>
```

### Best Practices:
- Selalu tampilkan indicator saat data dari cache
- Auto-sync saat kembali online
- Berikan opsi manual sync untuk user
- Tampilkan jumlah pending operations
- Handle conflict dengan UI yang jelas

---

## 📝 14. Data Validation Standards

### File Upload Validation:
```tsx
import { validateFile, ALLOWED_IMAGE_TYPES, SIZE_LIMITS } from '@/utils/fileValidation';

const result = await validateFile(file, {
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxSize: SIZE_LIMITS.avatar,
    checkDimensions: true,
    dimensionLimits: { minWidth: 100, minHeight: 100 },
});

if (!result.valid) {
    console.log(result.errors);
}
```

### Real-time Form Validation:
```tsx
import { ValidatedInput, PasswordStrengthMeter } from '@/components/ui/RealtimeValidation';

<ValidatedInput
    label="Email"
    schema={z.string().email()}
    showCharCount
    maxLength={100}
    debounceMs={300}
/>

<PasswordStrengthMeter password={password} showSuggestions />
```

### Validation Best Practices:
- Gunakan Zod schemas untuk semua form
- Validasi real-time dengan debounce 300ms
- Tampilkan character counter untuk text fields
- Berikan feedback visual langsung

---

## 🚀 15. Performance Standards

### Virtualized Lists:
```tsx
import { VirtualizedList, VirtualizedTable } from '@/components/ui/PerformanceComponents';

// For lists > 100 items
<VirtualizedList
    items={students}
    itemHeight={56}
    containerHeight={400}
    renderItem={(student) => <StudentCard student={student} />}
/>
```

### Lazy Loading Images:
```tsx
import { LazyImage } from '@/components/ui/PerformanceComponents';

<LazyImage
    src={imageUrl}
    fallback="/placeholder.png"
    threshold={0.1}
    className="w-full h-48 rounded-lg"
/>
```

### Debounce & Throttle:
```tsx
import { useDebouncedCallback, useThrottledCallback } from '@/components/ui/PerformanceComponents';

// Debounce search input (300ms)
const debouncedSearch = useDebouncedCallback(search, 300);

// Throttle scroll handler (100ms)
const throttledScroll = useThrottledCallback(handleScroll, 100);
```

---

## 🔒 16. Security Standards

### Rate Limiting:
```tsx
import { rateLimiters, checkRateLimit } from '@/utils/security';

// Use pre-configured limiters
const loginLimiter = rateLimiters.login();
const result = loginLimiter.check();

if (!result.allowed) {
    toast.error(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(result.resetIn / 1000)}s`);
}
```

### Input Sanitization:
```tsx
import { sanitize } from '@/utils/security';

const cleanHtml = sanitize.html(userInput);
const cleanFilename = sanitize.filename(file.name);
const cleanUrl = sanitize.url(link);
```

### Session Timeout:
```tsx
import { SessionTimeoutProvider } from '@/components/ui/SessionTimeout';

<SessionTimeoutProvider
    timeoutMs={30 * 60 * 1000}  // 30 minutes
    warningMs={25 * 60 * 1000}  // Warn at 25 min
    onTimeout={() => logout()}
>
    <App />
</SessionTimeoutProvider>
```

### Security Best Practices:
- Rate limit: Login 5/min, API 100/min, Forms 10/min
- Sanitize semua user input sebelum display
- Session timeout 30 menit dengan warning 5 menit sebelumnya
- Validate file uploads (type, size, signature)

---

## 🌐 17. Internationalization (i18n)

### Setup:
```tsx
import { I18nProvider, useTranslation, LanguageSelector } from '@/utils/i18n';

// Wrap app
<I18nProvider defaultLanguage="id">
    <App />
</I18nProvider>
```

### Usage:
```tsx
const { t, language, setLanguage } = useTranslation();

// Simple translation
<h1>{t('dashboard.welcome')}</h1>

// With parameters
<p>{t('students.count', { count: 50 })}</p>

// Language selector
<LanguageSelector />
```

### Supported Languages:
- `id` - Bahasa Indonesia (default)
- `en` - English

### Adding Translations:
Edit `src/utils/i18n.tsx` to add new translation keys.

---

## ♿ 18. Page Accessibility

### Accessible Page Wrapper:
```tsx
import { AccessiblePage, AccessibleSection } from '@/utils/pageAccessibility';

<AccessiblePage title="Daftar Siswa" description="Kelola data siswa">
    <AccessibleSection title="Filter" level={2}>
        {/* content */}
    </AccessibleSection>
</AccessiblePage>
```

### Skip Link (auto-included):
The app automatically includes a "Skip to main content" link for keyboard users.

### Accessible Components:
```tsx
import { 
    AccessibleTable, 
    AccessibleList, 
    AccessibleIconButton,
    AccessibleLoading 
} from '@/utils/pageAccessibility';

<AccessibleTable
    data={students}
    columns={columns}
    caption="Daftar siswa kelas 7A"
    keyExtractor={(s) => s.id}
/>

<AccessibleIconButton 
    icon={<Edit />} 
    label="Edit siswa" 
/>
```

---

## 🖨️ 19. Print Styling

Print styles are automatically applied via `print.css`. To customize:

### Hide Elements from Print:
```tsx
<div className="no-print">
    {/* This won't appear in print */}
</div>
```

### Show Only on Print:
```tsx
<div className="print-only">
    {/* This only appears when printing */}
</div>
```

### Page Breaks:
```tsx
<div className="page-break-before">New page starts here</div>
<div className="page-break-after">Page ends after this</div>
<div className="avoid-break">Don't break in middle</div>
```

### Print Header/Footer:
```tsx
<div className="print-header">
    <div className="school-name">SMP Negeri 1</div>
    <div className="report-title">Laporan Kehadiran</div>
</div>
```

---

*Dokumen ini harus di-update ketika ada perubahan pada design system.*





