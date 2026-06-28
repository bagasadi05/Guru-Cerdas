# Design System Documentation

## Overview

This design system provides a standardized set of design tokens and component styles to ensure consistency across the entire application. All developers should use these tokens instead of arbitrary values.

---

## Table of Contents

1. [Spacing](#spacing)
2. [Border Radius](#border-radius)
3. [Shadows](#shadows)
4. [Colors](#colors)
5. [Typography](#typography)
6. [Transitions & Motion](#transitions--motion)
7. [Accessibility (A11y)](#accessibility-a11y)
8. [Z-Index](#z-index)
9. [Component Styles](#component-styles)
10. [Usage Guidelines](#usage-guidelines)

---

## Spacing

Use the spacing scale for all padding, margin, and gap values.

### Scale

| Token | Value | Tailwind Class | Use Case |
|-------|-------|----------------|----------|
| `none` | 0px | `p-0`, `m-0` | Reset spacing |
| `2xs` | 2px | `p-0.5` | Micro spacing |
| `xs` | 4px | `p-1` | Tight spacing |
| `sm` | 8px | `p-2` | Small spacing |
| `md` | 12px | `p-3` | Medium spacing |
| `lg` | 16px | `p-4` | **Default component padding** |
| `4.5` | 18px | `p-4.5` | Tight-large (e.g., icon+label gap) |
| `xl` | 20px | `p-5` | Large spacing |
| `2xl` | 24px | `p-6` | Section padding |
| `3xl` | 32px | `p-8` | Large sections |
| `4xl` | 40px | `p-10` | Hero sections |
| `5xl` | 48px | `p-12` | Page sections |
| `6xl` | 64px | `p-16` | Major sections |
| `7xl` | 80px | `p-20` | Hero blocks |
| `8xl` | 96px | `p-24` | Maximum layout spacing |

### Usage

```tsx
// ✅ Correct
<div className="p-4">Content</div>  // 16px - standard
<div className="p-6">Section</div>   // 24px - section

// ❌ Avoid mixing arbitrary values
<div className="p-5">...</div>       // Use p-4 or p-6 instead
<div className="p-[17px]">...</div>  // Use scale values only
```

---

## Border Radius

Standardized border radius for consistent rounding.

### Scale

| Token | Value | Tailwind Class | Use Case |
|-------|-------|----------------|----------|
| `none` | 0 | `rounded-none` | Sharp corners |
| `sm` | 8px | `rounded-lg` | **Buttons, Inputs** |
| `md` | 12px | `rounded-xl` | **Dropdowns, Tooltips** |
| `lg` | 16px | `rounded-2xl` | **Cards, Nav items, Modals** |
| `xl` | 20px | `rounded-[1.25rem]` | Large rounded sections |
| `2xl` | 24px | `rounded-3xl` | Prominent elements |
| `3xl` | 32px | `rounded-[2rem]` | Extra prominent elements |
| `full` | 9999px | `rounded-full` | **Badges, Avatars** |

### Component Standards

| Component | Radius | Tailwind |
|-----------|--------|----------|
| Button | 8px | `rounded-lg` |
| Input | 8px | `rounded-lg` |
| Card | 16px | `rounded-2xl` |
| Modal | 16px | `rounded-2xl` |
| Bottom Sheet | 16px top | `rounded-t-2xl` |
| Badge/Pill | 9999px | `rounded-full` |
| Avatar | 9999px | `rounded-full` |
| Dropdown | 16px | `rounded-2xl` |
| Tooltip | 12px | `rounded-xl` |
| Nav Item | 16px | `rounded-2xl` |

### Usage

```tsx
// ✅ Correct - Use component standards
<button className="rounded-lg">Button</button>
<div className="rounded-2xl">Card</div>
<div className="rounded-2xl">Modal</div>

// ❌ Avoid inconsistent radius
<button className="rounded-xl">...</button>  // Use rounded-lg for buttons
<div className="rounded-[14px]">Card</div>   // Use rounded-2xl for cards
```

---

## Shadows

Elevation system for visual hierarchy.

### Scale

| Token | Tailwind Class | Use Case |
|-------|----------------|----------|
| `none` | `shadow-none` | Flat elements |
| `xs` | `shadow-xs` | Very subtle |
| `sm` | `shadow-sm` | **Cards (default)**, Buttons |
| `md` | `shadow-md` | **Hover states** |
| `lg` | `shadow-lg` | **Dropdowns, Tooltips** |
| `xl` | `shadow-xl` | FABs, Important elements |
| `2xl` | `shadow-2xl` | **Modals, Overlays** |

### Component Standards

| Component | Default | Hover |
|-----------|---------|-------|
| Card | `shadow-sm` | `shadow-lg` |
| Button | `shadow-sm` | `shadow-md` |
| Modal | `shadow-2xl` | - |
| Dropdown | `shadow-lg` | - |
| FAB | `shadow-xl` | - |
| Tooltip | `shadow-lg` | - |

### Colored Shadows

For branded/interactive elements:

```css
--shadow-primary: 0 4px 14px rgba(16, 185, 129, 0.25);   /* Emerald */
--shadow-accent: 0 4px 14px rgba(99, 102, 241, 0.25);    /* Indigo */
--shadow-success: 0 4px 14px rgba(16, 185, 129, 0.25);   /* Emerald */
--shadow-warning: 0 4px 14px rgba(245, 158, 11, 0.25);   /* Amber */
--shadow-error: 0 4px 14px rgba(239, 68, 68, 0.25);      /* Red */
```

### Usage

```tsx
// ✅ Correct
<div className="shadow-sm hover:shadow-lg">Card</div>
<button className="shadow-sm shadow-emerald-500/20">Primary Button</button>

// ❌ Avoid
<div className="shadow-md">Card</div>  // Use shadow-sm for default
```

---

## Colors

### Primary Palette (Emerald)

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#f0fdf4` | Light success backgrounds |
| 100 | `#dcfce7` | Hover success states |
| 200 | `#bbf7d0` | Borders |
| 300 | `#86efac` | Icons |
| 400 | `#4ade80` | Hover icons |
| **500** | `#10b981` | **Primary brand color, buttons, links** |
| 600 | `#059669` | Active states |
| 700 | `#047857` | Dark variant |
| 800 | `#065f46` | Dark backgrounds |
| 900 | `#064e3b` | Darkest |

### Accent Palette (Indigo)

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#eef2ff` | Light accent backgrounds |
| **500** | `#6366f1` | **Accent highlights, links** |
| 600 | `#4f46e5` | Active accent states |

### Neutral Palette (Slate)

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#f8fafc` | Light backgrounds |
| 100 | `#f1f5f9` | Card backgrounds |
| 200 | `#e2e8f0` | Borders |
| 300 | `#cbd5e1` | Disabled |
| 400 | `#94a3b8` | Placeholder text |
| 500 | `#64748b` | Secondary text |
| 600 | `#475569` | Body text |
| 700 | `#334155` | Headings |
| **800** | `#1e293b` | **Dark mode backgrounds** |
| **900** | `#0f172a` | **Darkest backgrounds** |

### Semantic Colors

| Type | Light | Main | Dark |
|------|-------|------|------|
| Success | `#d1fae5` | `#10b981` | `#065f46` |
| Warning | `#fef3c7` | `#f59e0b` | `#92400e` |
| Error | `#fee2e2` | `#ef4444` | `#991b1b` |
| Info | `#dbeafe` | `#3b82f6` | `#1e40af` |

### Usage

```tsx
// ✅ Correct
<button className="bg-emerald-500 hover:bg-emerald-600">Primary</button>
<span className="text-emerald-600">Success text</span>
<div className="bg-slate-50 dark:bg-slate-800">Card</div>

// ❌ Avoid using arbitrary colors
<button className="bg-purple-500">...</button>  // Use brand palettes
<span className="text-green-400">...</span>      // Use emerald palette
```

---

## Typography

### Font Families

| Token | Font | Use Case |
|-------|------|----------|
| `sans` | Inter | **Default - body text, UI** |
| `serif` | Tinos | Headings, Display text |

### Font Sizes

| Token | Size | Tailwind | Use Case |
|-------|------|----------|----------|
| `xxs` | 10px | `text-xxs` | Micro labels, badges, gender markers |
| `xs` | 12px | `text-xs` | Captions, Labels |
| `sm` | 14px | `text-sm` | Secondary text |
| `base` | 16px | `text-base` | **Body text** |
| `lg` | 18px | `text-lg` | Lead paragraphs |
| `xl` | 20px | `text-xl` | H5, Subheadings |
| `2xl` | 24px | `text-2xl` | H4 |
| `3xl` | 30px | `text-3xl` | H3 |
| `4xl` | 36px | `text-4xl` | H2, Page titles |
| `5xl` | 48px | `text-5xl` | H1, Hero |

**Note:** `text-xxs` is registered in `tailwind.config.cjs` fontSize extension and maps to `0.625rem` (10px).

### Heading Styles

```tsx
// H1
<h1 className="text-4xl md:text-5xl font-bold tracking-tight">Page Title</h1>

// H2
<h2 className="text-3xl md:text-4xl font-bold tracking-tight">Section</h2>

// H3
<h3 className="text-2xl md:text-3xl font-semibold">Subsection</h3>

// H4
<h4 className="text-xl md:text-2xl font-semibold">Card Title</h4>

// Body
<p className="text-base leading-relaxed">Body text...</p>

// Caption
<span className="text-xs text-slate-500">Caption text</span>
```

---

## Transitions & Motion

### CSS Transitions

For standard CSS transitions, use the following tokens:

#### Durations

| Token | Duration | Use Case |
|-------|----------|----------|
| `instant` | 0ms | No transition |
| `fast` | 100ms | Micro-interactions |
| `normal` | 200ms | **Default for most** |
| `slow` | 300ms | Page transitions |
| `slower` | 500ms | Complex animations |

#### Easings

| Token | Curve | Use Case |
|-------|-------|----------|
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | **Default - entering** |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Continuous motion |
| `bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful interactions |

### Framer Motion Tokens

For React animations using `framer-motion`, import unified tokens from [motion.ts](file:///c:/Users/yuiop/Documents/Coding/Guru-Cerdas/Guru-Cerdas/src/styles/motion.ts).

#### Durations

| Token | Seconds | Use Case |
|-------|---------|----------|
| `fast` | 0.15s (150ms) | Micro-interactions (hover, focus) |
| `base` | 0.25s (250ms) | **Default - most UI transitions** |
| `slow` | 0.40s (400ms) | Page transitions, larger moves |
| `chart` | 0.70s (700ms) | Chart/visualization animations |
| `long` | 1.00s (1000ms) | Long-form transitions |
| `deliberate` | 1.20s (1200ms) | Deliberate, emphasized motion |

#### Easings

| Token | Curve | Use Case |
|-------|-------|----------|
| `easeOut` | `cubic-bezier(0.16, 1, 0.3, 1)` (easeOutExpo) | **Default - entering, settling** |
| `easeInOutQuad` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Continuous motion, two-way transitions |
| `overshoot` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring-like overshoot, attention |
| `spring` | `{ type: 'spring', damping: 25, stiffness: 300 }` | Bouncy natural motion |

#### Reusable Animation Variants
We expose predefined, accessible variants to ensure standard entry/exit behavior:
- `fadeIn`: Simple fade animation.
- `slideUp`: Fade and slide up by 16px.
- `scaleIn`: Fade and scale from 95% to 100%.
- `staggerContainer`: Staggers children by 0.05 seconds with a 0.05s initial delay.

```typescript
import { duration, easing } from '@/styles/motion';

// Durations
duration.fast        // 0.15s
duration.base        // 0.25s
duration.slow        // 0.40s
duration.chart       // 0.70s
duration.long        // 1.00s
duration.deliberate  // 1.20s

// Easings
easing.easeOut        // [0.16, 1, 0.3, 1]
easing.easeInOutQuad  // [0.25, 0.46, 0.45, 0.94]
easing.overshoot      // [0.34, 1.56, 0.64, 1]
easing.spring         // { type: 'spring', damping: 25, stiffness: 300 }
```

```tsx
import { motion } from 'framer-motion';
import { slideUp, staggerContainer } from '@/styles/motion';

function List({ items }) {
  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      {items.map(item => (
        <motion.div key={item.id} variants={slideUp}>
          {item.name}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

## Accessibility (A11y)

The application is built to be accessible to all users, adhering to **WCAG 2.1 AA** standards. All ui/* primitives (`Button`, `Input`, `Textarea`, `Checkbox`, `Modal`, `DropdownMenu`, `BottomSheet`, `FAB`, `FAB Menu`, `GlobalSearch`, `SwipeableListItem`) are accessible by default.

### 1. Focus Indicators
All interactive elements must have a clear, high-contrast focus ring when focused using a keyboard. Avoid browser default outlines. The standard emerald focus ring is defined as:
- **Tailwind Class**: `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-900`
- Combine `focus:outline-none` with `focus-visible:ring-...` (NOT `focus:ring-...`) to only show the ring for keyboard users, not on click/touch.
- Never remove focus rings from interactive elements.

### 2. Screen Readers & Labels
Icon-only buttons **must** have descriptive text labels for screen readers. Use either `aria-label` directly or the unified `IconButton` component. Inputs must have either a visible `<label htmlFor>` or an `aria-label`. Decorative icons should be marked `aria-hidden="true"`. Live regions exist via `AnnouncerProvider`/`useAnnounce` for dynamic updates.
- Never use a raw icon inside a button without a label.
- Use the unified `IconButton` component from [accessibility.tsx](file:///c:/Users/yuiop/Documents/Coding/Guru-Cerdas/Guru-Cerdas/src/utils/accessibility.tsx):
```tsx
import { IconButton } from '@/utils/accessibility';
import { EditIcon } from '@/components/Icons';

// ✅ Correct
<IconButton 
  icon={<EditIcon />} 
  label="Ubah Data Siswa" 
  onClick={handleEdit} 
/>
```

### 3. Reduced Motion
Always respect user operating system preferences for reduced motion.
- Use the `useReducedMotion()` hook from `framer-motion`.
- For large transitions (animations > 0.5s, large slide/scale factors), shorten the duration or bypass the animation entirely when reduced motion is requested.
- All `FloatingActionMenu`, `BottomSheet`, `Modal`, and global motion variants already check `shouldReduceMotion` internally.

```tsx
import { useReducedMotion } from 'framer-motion';

function Component() {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion
    ? { duration: 0.1 }
    : { duration: 1.0, ease: "easeOut" };

  return (
    <motion.div animate={{ scale: 1 }} transition={transition} />
  );
}
```

### 4. Color Contrast (WCAG 2.1 AA)
All text and interactive elements must meet AA contrast minimums. The design system palette is calibrated for this:
- **Normal text (< 18px or < 14px bold)**: minimum **4.5:1** contrast against background.
- **Large text (≥ 18px or ≥ 14px bold)**: minimum **3:1** contrast against background.
- **Non-text UI elements** (icons, focus rings, borders distinguishing state): minimum **3:1**.

Approved color pairs (verified AA on light and dark):
- Body text: `text-slate-700` on `bg-white` (8.6:1 light) / `text-slate-200` on `bg-slate-900` (12.6:1 dark).
- Muted text: `text-slate-500` on `bg-white` (4.6:1 light) / `text-slate-400` on `bg-slate-900` (5.7:1 dark).
- Primary action: `text-white` on `bg-emerald-500` (2.9:1 — use for large/bold text or non-text only).
- Focus ring: `ring-emerald-500` (visible 3:1 on both white and slate-900).

Avoid pairing `text-slate-400` (placeholder) on `bg-slate-200` or `text-yellow-300` on dark backgrounds — these fail AA.

---

## Z-Index

Standardized z-index scale for proper layering.

| Token | Value | Use Case |
|-------|-------|----------|
| `behind` | -1 | Background decorations |
| `base` | 0 | Default content |
| `dropdown` | 10 | Dropdown triggers |
| `sticky` | 20 | Sticky headers |
| `fixed` | 30 | Fixed sidebars, headers |
| `overlay` | 40 | Modal backdrops |
| `modal` | 50 | **Modals, Dialogs** |
| `popover` | 60 | Tooltips, Popovers |
| `toast` | 70 | Toast notifications |
| `max` | 9999 | Critical overlays |

### Usage

```tsx
// ✅ Correct
<header className="z-30">Fixed header</header>
<div className="z-40">Modal backdrop</div>
<div className="z-50">Modal content</div>
<div className="z-70">Toast</div>

// ❌ Avoid arbitrary z-index
<div className="z-[100]">...</div>
<div className="z-[999]">...</div>
```

---

## Component Styles

Pre-built component style combinations from `designTokens.ts`:

### Card

```tsx
import { componentStyles } from '@/styles/designTokens';

// Static card
<div className={componentStyles.card}>...</div>

// Interactive card
<div className={componentStyles.cardInteractive}>...</div>
```

**Output:**
- `rounded-2xl` (16px)
- `shadow-sm` → `shadow-lg` on hover
- `bg-white dark:bg-slate-800`
- `border border-slate-200 dark:border-slate-700`
- `transition-all duration-200`

### Button Primary

```tsx
<button className={componentStyles.buttonPrimary}>
    Primary Button
</button>
```

**Output:**
- `rounded-lg` (8px)
- `bg-emerald-500 hover:bg-emerald-600`
- `shadow-sm hover:shadow-md`
- `active:scale-95`

### Input

```tsx
<input className={componentStyles.input} />
```

**Output:**
- `rounded-lg` (8px)
- `border-slate-200 dark:border-slate-700`
- `focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`

### Modal

```tsx
<div className={componentStyles.modal}>
    Modal content
</div>
```

**Output:**
- `rounded-2xl` (16px)
- `shadow-2xl`
- `bg-white dark:bg-slate-900`

---

## Usage Guidelines

### DO ✅

1. **Use the spacing scale** - Always use Tailwind spacing classes (`p-4`, `p-6`, etc.)
2. **Follow component radius standards** - Buttons are `rounded-lg`, Cards are `rounded-2xl`
3. **Use semantic colors** - Error = red, Success = emerald, Warning = amber
4. **Maintain shadow hierarchy** - Cards get `shadow-sm`, Modals get `shadow-2xl`
5. **Import from designTokens** - Use `componentStyles` for consistency

### DON'T ❌

1. **Avoid arbitrary values** - No `p-[17px]` or `rounded-[13px]`
2. **Don't mix radius styles** - Don't use `rounded-md` and `rounded-xl` in similar components
3. **Don't use raw colors** - Use the color palette, not `#some-random-color`
4. **Avoid z-index wars** - Use the z-index scale, not `z-[9999]`

### Quick Reference

| Element | Padding | Radius | Shadow |
|---------|---------|--------|--------|
| Button | `px-4 py-2` | `rounded-lg` | `shadow-sm` |
| Card | `p-4` or `p-6` | `rounded-2xl` | `shadow-sm` |
| Modal | `p-6` | `rounded-2xl` | `shadow-2xl` |
| Input | `px-4 py-3` | `rounded-lg` | none |
| Badge | `px-2.5 py-0.5` | `rounded-full` | none |

---

## File Locations

- **TypeScript Tokens**: `src/styles/designTokens.ts`
- **CSS Variables**: `src/styles/designSystem.css`
- **Documentation**: `DESIGN_SYSTEM.md`

---

## Import Example

```tsx
// Import tokens
import { 
    componentStyles, 
    colorClasses, 
    radiusClasses,
    cx 
} from '@/styles/designTokens';

// Use in component
function MyCard({ children, interactive = false }) {
    return (
        <div className={cx(
            interactive ? componentStyles.cardInteractive : componentStyles.card,
            'p-6'
        )}>
            {children}
        </div>
    );
}
```

---

*Last updated: June 2026 (Design Sprint 8 — QA Final, Aksesibilitas, Dokumentasi & Sign-off)*
