# Responsive Design Guide - Portal Guru

Panduan ini menjelaskan implementasi responsive design di Portal Guru.

## Breakpoints

Aplikasi menggunakan breakpoint Tailwind CSS standar:

| Breakpoint | Width      | Usage                    |
|------------|------------|--------------------------|
| `sm`       | ≥ 640px    | Large phones, landscape  |
| `md`       | ≥ 768px    | Tablets                  |
| `lg`       | ≥ 1024px   | Desktop                  |
| `xl`       | ≥ 1280px   | Large desktop            |
| `2xl`      | ≥ 1536px   | Extra large screens      |

## Spacing Pattern

Untuk konsistensi, gunakan pattern spacing berikut:

```tsx
// Page container padding
className="p-4 lg:p-8"

// Section gaps
className="gap-4 lg:gap-6"

// Card padding (skip md breakpoint)
className="p-4 lg:p-6"
```

**Jangan gunakan** intermediate breakpoints yang tidak perlu:
```tsx
// ❌ Buruk - terlalu banyak breakpoints
className="p-4 md:p-6 lg:p-8"

// ✅ Baik - hanya yang diperlukan
className="p-4 lg:p-8"
```

## Grid Layouts

### Stats Grid
```tsx
// 2 cols mobile, 3 cols tablet, 4 cols desktop
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
```

### Card Grid
```tsx
// Progressive column increase
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4"
```

### Schedule Grid
```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

## Table Responsiveness

Gunakan class `table-responsive` untuk tabel yang memerlukan horizontal scroll di mobile:

```tsx
<div className="table-responsive">
  <table className="min-w-full">
    {/* table content */}
  </table>
</div>
```

Class ini akan:
- Menambahkan horizontal scroll di mobile
- Memberikan negative margin untuk full-width scroll
- Menyembunyikan scroll di desktop (≥1024px)

## Text Truncation

### Single Line Truncation
```tsx
className="truncate"
// atau
className="text-ellipsis"
```

### Multi-line Truncation
```tsx
// 1 line
className="truncate-1"

// 2 lines
className="truncate-2"

// 3 lines
className="truncate-3"

// Tailwind built-in
className="line-clamp-2"
```

## Fluid Typography

Untuk smooth font scaling, gunakan class fluid typography:

```tsx
// Headings
className="fluid-h1" // 30px → 48px
className="fluid-h2" // 24px → 36px
className="fluid-h3" // 20px → 30px
className="fluid-h4" // 18px → 24px

// Body text
className="fluid-body"  // 14px → 16px
className="fluid-small" // 12px → 14px
```

## Mobile Navigation

Bottom navigation hanya muncul di layar < 1024px:

```tsx
{isMobile && (
  <nav className="mobile-bottom-nav fixed bottom-0 ...">
    {/* navigation items */}
  </nav>
)}
```

## Touch Targets

Semua elemen interaktif harus minimal 44x44px:

```tsx
// Minimum touch target
className="touch-target"      // 44x44px
className="touch-target-lg"   // 48x48px

// Atau dengan inline style
style={{ minWidth: '44px', minHeight: '44px' }}
```

## Orientation Support

Gunakan hook `useOrientation` untuk mendeteksi orientasi:

```tsx
import { useOrientation } from '../hooks/useOrientation';

const MyComponent = () => {
  const { isLandscape, isPortrait, orientation } = useOrientation();
  
  return (
    <div className={isLandscape && isMobile ? 'flex-row' : 'flex-col'}>
      {/* content */}
    </div>
  );
};
```

### Landscape CSS Optimizations
```css
@media (orientation: landscape) and (max-height: 500px) {
  .landscape-compact {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}
```

## Component Examples

### Responsive Card
```tsx
<Card className="p-4 lg:p-6">
  <CardTitle className="truncate">{longTitle}</CardTitle>
  <CardDescription className="line-clamp-2">{description}</CardDescription>
</Card>
```

### Responsive Header
```tsx
<header className="flex items-center justify-between px-4 lg:px-8">
  <button className="lg:hidden touch-target">Menu</button>
  <SearchTrigger className="hidden sm:flex" />
</header>
```

### Responsive Sidebar
```tsx
<div className={`
  fixed lg:static inset-y-0 left-0 z-50 
  transform transition-transform lg:translate-x-0
  ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
`}>
  <Sidebar />
</div>
```

## Testing Checklist

### Mobile (< 768px)
- [ ] Bottom navigation visible
- [ ] Sidebar slides from left
- [ ] Touch targets ≥ 44px
- [ ] No horizontal overflow
- [ ] Text readable (min 16px)

### Tablet (768px - 1024px)
- [ ] Grid columns optimal (2-3 cols)
- [ ] Navigation accessible
- [ ] Content not stretched

### Desktop (> 1024px)
- [ ] Sidebar visible and fixed
- [ ] Bottom navigation hidden
- [ ] Content centered with max-width
- [ ] Hover states working

## Design Tokens

Gunakan CSS custom properties dari `designSystem.css`:

```css
/* Spacing */
--space-lg: 1rem;      /* 16px */
--space-2xl: 1.5rem;   /* 24px */
--space-3xl: 2rem;     /* 32px */

/* Breakpoints (for reference) */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

## Testing Utilities

Tersedia utilities untuk testing di browser console (development mode):

### Touch Target Audit
```javascript
// Run touch target audit
auditTouchTargets();

// Highlight elements with issues
highlightTouchIssues();

// Clear highlights
clearTouchHighlights();
```

### Responsive Status
```javascript
// Check responsive design status
checkResponsive();

// Get current breakpoint info
getBreakpoint();

// Check for horizontal overflow
checkOverflow();

// Get grid layout info
getGrids();

// Audit spacing consistency
auditSpacing();
```

### Example Output
```
🎯 Touch Target Audit Results
Score: 92%
Total interactive elements: 48
✅ Passed: 44
❌ Failed: 4
⚠️ Issues Found:
  1. button.icon-btn - Size: 32x32px (min: 44px)
  2. a.nav-link - Size: 40x40px (min: 44px)
```

## Best Practices

1. **Mobile-first**: Mulai dari layout mobile, tambahkan breakpoints untuk layar lebih besar
2. **Skip intermediate breakpoints**: Gunakan `p-4 lg:p-8` bukan `p-4 md:p-6 lg:p-8`
3. **Consistent patterns**: Gunakan pattern yang sama di seluruh aplikasi
4. **Test on real devices**: Selalu test di perangkat nyata, bukan hanya DevTools
5. **Minimum touch targets**: Pastikan semua elemen interaktif ≥ 44x44px
6. **Use testing utilities**: Jalankan `auditTouchTargets()` dan `checkResponsive()` secara berkala

