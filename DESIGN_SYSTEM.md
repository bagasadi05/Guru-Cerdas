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
6. [Transitions](#transitions)
7. [Z-Index](#z-index)
8. [Component Styles](#component-styles)
9. [Usage Guidelines](#usage-guidelines)

---

## Spacing

Use the spacing scale for all padding, margin, and gap values.

### Scale

| Token | Value | Tailwind Class | Use Case |
|-------|-------|----------------|----------|
| `none` | 0 | `p-0`, `m-0` | Reset spacing |
| `2xs` | 2px | `p-0.5` | Micro spacing |
| `xs` | 4px | `p-1` | Tight spacing |
| `sm` | 8px | `p-2` | Small spacing |
| `md` | 12px | `p-3` | Medium spacing |
| `lg` | 16px | `p-4` | **Default component padding** |
| `xl` | 20px | `p-5` | Large spacing |
| `2xl` | 24px | `p-6` | Section padding |
| `3xl` | 32px | `p-8` | Large sections |
| `4xl` | 40px | `p-10` | Hero sections |
| `5xl` | 48px | `p-12` | Page sections |
| `6xl` | 64px | `p-16` | Major sections |

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
| `sm` | 4px | `rounded` | Subtle rounding |
| `md` | 8px | `rounded-lg` | **Buttons, Inputs** |
| `lg` | 12px | `rounded-xl` | **Cards, Nav items** |
| `xl` | 16px | `rounded-2xl` | **Modals, Dropdowns** |
| `2xl` | 24px | `rounded-3xl` | Feature cards |
| `3xl` | 32px | `rounded-[2rem]` | Hero elements |
| `full` | 9999px | `rounded-full` | **Badges, Avatars** |

### Component Standards

| Component | Radius | Tailwind |
|-----------|--------|----------|
| Button | 8px | `rounded-lg` |
| Input | 8px | `rounded-lg` |
| Card | 16px | `rounded-2xl` |
| Modal | 24px | `rounded-3xl` |
| Bottom Sheet | 24px top | `rounded-t-3xl` |
| Badge/Pill | 9999px | `rounded-full` |
| Avatar | 9999px | `rounded-full` |
| Dropdown | 16px | `rounded-2xl` |
| Tooltip | 8px | `rounded-lg` |
| Nav Item | 12px | `rounded-xl` |

### Usage

```tsx
// ✅ Correct - Use component standards
<button className="rounded-lg">Button</button>
<div className="rounded-2xl">Card</div>
<div className="rounded-3xl">Modal</div>

// ❌ Avoid inconsistent radius
<button className="rounded-xl">...</button>  // Use rounded-lg for buttons
<div className="rounded-md">Card</div>       // Use rounded-2xl for cards
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
--shadow-primary: 0 4px 14px rgba(99, 102, 241, 0.25);   /* Indigo */
--shadow-success: 0 4px 14px rgba(16, 185, 129, 0.25);   /* Green */
--shadow-warning: 0 4px 14px rgba(245, 158, 11, 0.25);   /* Amber */
--shadow-error: 0 4px 14px rgba(239, 68, 68, 0.25);      /* Red */
```

### Usage

```tsx
// ✅ Correct
<div className="shadow-sm hover:shadow-lg">Card</div>
<button className="shadow-sm shadow-indigo-500/20">Primary Button</button>

// ❌ Avoid
<div className="shadow-md">Card</div>  // Use shadow-sm for default
```

---

## Colors

### Primary Palette (Indigo)

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#eef2ff` | Light backgrounds |
| 100 | `#e0e7ff` | Hover states |
| 200 | `#c7d2fe` | Borders |
| 300 | `#a5b4fc` | Icons |
| 400 | `#818cf8` | Hover icons |
| **500** | `#6366f1` | **Primary buttons, Links** |
| 600 | `#4f46e5` | Active states |
| 700 | `#4338ca` | Dark variant |
| 800 | `#3730a3` | Dark backgrounds |
| 900 | `#312e81` | Darkest |

### Secondary Palette (Emerald)

| Shade | Hex | Use Case |
|-------|-----|----------|
| 50 | `#ecfdf5` | Light success backgrounds |
| **500** | `#10b981` | **Success states, Secondary actions** |
| 600 | `#059669` | Active success |

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
<button className="bg-indigo-600 hover:bg-indigo-700">Primary</button>
<span className="text-emerald-600">Success text</span>
<div className="bg-slate-50 dark:bg-slate-800">Card</div>

// ❌ Avoid using arbitrary colors
<button className="bg-purple-500">...</button>  // Use indigo palette
<span className="text-green-400">...</span>      // Use emerald palette
```

---

## Typography

### Font Families

| Token | Font | Use Case |
|-------|------|----------|
| `sans` | Inter | **Default - body text, UI** |
| `serif` | Playfair Display | Headings, Display text |
| `mono` | JetBrains Mono | Code, Technical content |

### Font Sizes

| Token | Size | Tailwind | Use Case |
|-------|------|----------|----------|
| `xs` | 12px | `text-xs` | Captions, Labels |
| `sm` | 14px | `text-sm` | Secondary text |
| `base` | 16px | `text-base` | **Body text** |
| `lg` | 18px | `text-lg` | Lead paragraphs |
| `xl` | 20px | `text-xl` | H5, Subheadings |
| `2xl` | 24px | `text-2xl` | H4 |
| `3xl` | 30px | `text-3xl` | H3 |
| `4xl` | 36px | `text-4xl` | H2, Page titles |
| `5xl` | 48px | `text-5xl` | H1, Hero |

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

## Transitions

### Durations

| Token | Duration | Use Case |
|-------|----------|----------|
| `instant` | 0ms | No transition |
| `fast` | 100ms | Micro-interactions |
| `normal` | 200ms | **Default for most** |
| `slow` | 300ms | Page transitions |
| `slower` | 500ms | Complex animations |

### Easings

| Token | Curve | Use Case |
|-------|-------|----------|
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | **Default - entering** |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Continuous motion |
| `bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful interactions |

### Usage

```tsx
// ✅ Standard transition
<div className="transition-all duration-200 ease-out">...</div>

// ✅ Shorthand
<div className="transition-colors">...</div>  // Color changes only
<div className="transition-transform">...</div>  // Transform only
```

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
- `rounded-xl` (16px)
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
- `bg-indigo-600 hover:bg-indigo-700`
- `shadow-sm hover:shadow-md`
- `active:scale-95`

### Input

```tsx
<input className={componentStyles.input} />
```

**Output:**
- `rounded-lg` (8px)
- `border-slate-200 dark:border-slate-700`
- `focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`

### Modal

```tsx
<div className={componentStyles.modal}>
    Modal content
</div>
```

**Output:**
- `rounded-3xl` (24px)
- `shadow-2xl`
- `bg-white dark:bg-slate-900`

---

## Usage Guidelines

### DO ✅

1. **Use the spacing scale** - Always use Tailwind spacing classes (`p-4`, `p-6`, etc.)
2. **Follow component radius standards** - Buttons are `rounded-lg`, Cards are `rounded-2xl`
3. **Use semantic colors** - Error = red, Success = green, Warning = amber
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
| Modal | `p-6` | `rounded-3xl` | `shadow-2xl` |
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

*Last updated: December 2024*
