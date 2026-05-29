# Design Document

## Technical Architecture Overview

This design document describes the technical approach for improving mobile UX in Portal Guru. The improvements build upon the existing mobile infrastructure (haptics service, swipe gestures, bottom navigation, pull-to-refresh, keyboard awareness) and refine them to align with Material Design 3 guidelines.

### Architecture Principles

1. **Progressive Enhancement**: All improvements work on web first, with native enhancements via Capacitor
2. **Composable Hooks**: Each mobile UX feature is exposed as a reusable React hook
3. **Zero Breaking Changes**: Existing components continue to work; new components are opt-in replacements
4. **Performance First**: All animations use CSS transforms/opacity for GPU acceleration

### Module Organization

```
src/
├── components/
│   └── mobile/
│       ├── EnhancedBottomSheet.tsx      # [NEW] Improved bottom sheet with drag gestures
│       ├── EnhancedFAB.tsx              # [NEW] Material Design 3 FAB with menu
│       ├── SwipeableListItem.tsx        # [NEW] List item with swipe actions
│       ├── EnhancedMobileBottomNav.tsx  # [EXISTING - UPDATE]
│       ├── MoreMenuBottomSheet.tsx      # [EXISTING - UPDATE]
│       └── LandscapeSideRail.tsx        # [EXISTING - no changes]
├── hooks/
│   ├── useEnhancedHaptics.ts           # [NEW] Pattern-based haptic feedback
│   ├── useBottomSheet.ts               # [NEW] Bottom sheet state management
│   ├── useSwipeActions.ts              # [NEW] Swipe-to-action hook
│   ├── useKeyboardAwareness.ts         # [NEW] Enhanced keyboard detection
│   ├── useReducedMotion.ts             # [NEW] Respects prefers-reduced-motion
│   └── useTouchTarget.ts              # [NEW] Touch target size enforcement
├── services/
│   └── haptics.ts                      # [EXISTING - UPDATE] Add pattern support
└── utils/
    └── mobileUX.tsx                    # [EXISTING - UPDATE] Bump min size to 48px
```

## Component Designs

### 1. Enhanced Touch Target System

**Requirement:** R1 - Enhanced Touch Target Sizing

**Approach:** Update the existing `TouchTarget` component in `mobileUX.tsx` to use 48px minimum (Material Design 3) and add press feedback.

```typescript
// src/utils/mobileUX.tsx - Updated TouchTarget
interface TouchTargetProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  minSize?: number; // Default changed from 44 to 48
  as?: 'button' | 'div' | 'a';
  pressScale?: number; // Default 0.95
}
```

**Changes:**
- Default `minSize` from 44 → 48
- Add `active:scale-[0.95]` CSS class for press feedback
- Add `gap-2` (8px) spacing utility class `.touch-target-group`
- Update `auditTouchTargets()` threshold from 44 → 48

---

### 2. Enhanced Bottom Sheet Component

**Requirement:** R2 - Improved Bottom Sheet Component

**Approach:** Create a new `EnhancedBottomSheet` that replaces the existing basic `BottomSheet.tsx` with proper drag-to-dismiss, keyboard awareness, and scroll locking.

```typescript
// src/components/mobile/EnhancedBottomSheet.tsx
interface EnhancedBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxHeight?: string; // Default '70vh'
  showDragHandle?: boolean; // Default true
  closeOnBackdrop?: boolean; // Default true
  keyboardAware?: boolean; // Default true
  snapPoints?: number[]; // Optional snap points as percentages
}
```

**Key Implementation Details:**
- Uses `cubic-bezier(0.32, 0.72, 0, 1)` for open animation (Material Design 3 standard decelerate)
- Drag handle: 32x4px rounded pill, centered at top
- Swipe-down threshold: 100px or 30% of sheet height to dismiss
- Keyboard awareness: listens to `visualViewport.resize` and adjusts sheet position
- Scroll lock: uses existing `lockScroll`/`unlockScroll` from `mobileUX.tsx`
- Content scroll: `overscroll-behavior: contain` prevents scroll chaining
- Portal rendering via `createPortal` to `document.body`

**State Machine:**
```
closed → opening → open → closing → closed
                        → dragging → (open | closing)
```

---

### 3. Enhanced Floating Action Button

**Requirement:** R3 - Enhanced FAB

**Approach:** Create a unified `EnhancedFAB` component that merges the best of `FloatingActionButton.tsx` and `FloatingActionMenu.tsx` with Material Design 3 sizing.

```typescript
// src/components/mobile/EnhancedFAB.tsx
interface EnhancedFABProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  actions?: FABAction[]; // Up to 4 items
  variant?: 'primary' | 'secondary' | 'tertiary';
  position?: 'bottom-right' | 'bottom-left';
  hideOnScroll?: boolean;
  hideOnKeyboard?: boolean;
  landscapeOffset?: boolean; // Offset for landscape side rail
}

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}
```

**Sizing:**
- Primary: 56x56px (Material Design 3 standard)
- Secondary: 40x40px
- Tertiary: 48x48px (small FAB)
- Action items: 48x48px touch target

**Positioning:**
- Portrait: `bottom: calc(80px + env(safe-area-inset-bottom))` (above bottom nav)
- Landscape: `right: calc(80px + 16px)` (offset from side rail)
- Keyboard visible: hidden or moved up

**Animation:**
- Menu expand: staggered scale-in with 50ms delay per item
- Menu collapse: simultaneous scale-down 200ms
- Haptic: 20ms vibration on tap

---

### 4. Enhanced Haptic Feedback Service

**Requirement:** R4 - Improved Haptic Feedback Patterns

**Approach:** Extend the existing `haptics.ts` service with pattern-based vibration and a new `useEnhancedHaptics` hook.

```typescript
// src/hooks/useEnhancedHaptics.ts
interface HapticPatterns {
  tap: () => Promise<void>;        // [10ms] - button tap
  select: () => Promise<void>;     // [20ms] - list item selection
  success: () => Promise<void>;    // [10, 50, 10] - action completed
  warning: () => Promise<void>;    // [15, 100, 15, 100, 15] - attention needed
  error: () => Promise<void>;      // [50, 50, 50] - error occurred
}

export function useEnhancedHaptics(): HapticPatterns;
```

**Implementation Strategy:**
- On native (Capacitor): Use `Haptics.impact()` and `Haptics.notification()` APIs
- On web: Use `navigator.vibrate()` with pattern arrays as fallback
- Silent fail: All methods wrapped in try/catch, no-op on unsupported devices
- Visual feedback: Each haptic trigger also dispatches a custom event for visual indicators

**Pattern Mapping:**
| Pattern | Native (Capacitor) | Web Fallback |
|---------|-------------------|--------------|
| tap | ImpactStyle.Light | vibrate([10]) |
| select | ImpactStyle.Medium | vibrate([20]) |
| success | NotificationType.Success | vibrate([10, 50, 10]) |
| warning | NotificationType.Warning | vibrate([15, 100, 15, 100, 15]) |
| error | NotificationType.Error | vibrate([50, 50, 50]) |

---

### 5. Swipeable List Item Component

**Requirement:** R5 - Enhanced Swipe Gesture Support

**Approach:** Create a `SwipeableListItem` component that wraps list items with swipe-to-reveal actions.

```typescript
// src/components/mobile/SwipeableListItem.tsx
interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string; // Background color
  onClick: () => void;
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[]; // Swipe right reveals these
  rightActions?: SwipeAction[]; // Swipe left reveals these
  threshold?: number; // Default 100px
  disabled?: boolean;
  disableInLandscape?: boolean; // Default true
}
```

**Gesture Logic:**
1. Touch start: Record initial position
2. Touch move: If horizontal delta > 10px and > vertical delta, begin swipe
3. During swipe: Translate item, reveal action background
4. Touch end:
   - If distance > 50% of threshold: snap to reveal actions
   - If distance < 50%: animate back to origin
   - If distance > threshold: trigger action automatically
5. Vertical scroll priority: If vertical delta > horizontal delta within first 10px, cancel swipe

**Landscape Handling:**
- When `disableInLandscape` is true, check `window.matchMedia('(orientation: landscape)')` and disable swipe gestures

---

### 6. Safe Area Utilities

**Requirement:** R6 - Better Safe Area Handling

**Approach:** Enhance the existing `useSafeAreaInsets` hook and add CSS utility classes.

```typescript
// Updated src/utils/mobileUX.tsx
export function useSafeAreaInsets(): SafeAreaInsets {
  // Use CSS custom properties set by viewport-fit=cover
  // --sat, --sar, --sab, --sal
}
```

**CSS Additions (tailwind.config.js or global CSS):**
```css
/* Safe area utilities */
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
.pt-safe { padding-top: env(safe-area-inset-top, 0px); }
.pl-safe { padding-left: env(safe-area-inset-left, 0px); }
.pr-safe { padding-right: env(safe-area-inset-right, 0px); }
.mb-safe { margin-bottom: env(safe-area-inset-bottom, 0px); }
.mt-safe { margin-top: env(safe-area-inset-top, 0px); }
```

**HTML Meta Tag (index.html):**
```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

---

### 7. Enhanced Pull-to-Refresh

**Requirement:** R7 - Pull-to-Refresh Enhancement

**Approach:** Update the existing `PullToRefresh.tsx` component with success/error feedback and toast messages.

**Enhancements:**
- Add success toast: "Data berhasil diperbarui" (2s auto-dismiss)
- Add error toast: "Gagal memperbarui. Coba lagi?" with retry button
- Haptic feedback: success pattern on complete, error pattern on fail
- Disable re-pull during refresh (already implemented)
- Smooth spring-back animation when released below threshold

---

### 8. Enhanced Keyboard Awareness

**Requirement:** R8 - Keyboard Awareness

**Approach:** Create a dedicated `useKeyboardAwareness` hook that improves upon the existing implementation.

```typescript
// src/hooks/useKeyboardAwareness.ts
interface KeyboardState {
  isVisible: boolean;
  height: number;
  animating: boolean;
}

interface UseKeyboardAwarenessOptions {
  hideBottomNav?: boolean; // Default true
  hideFAB?: boolean; // Default true
  scrollToFocused?: boolean; // Default true
  scrollOffset?: number; // Extra padding above focused element
}

export function useKeyboardAwareness(options?: UseKeyboardAwarenessOptions): KeyboardState;
```

**Implementation:**
- Primary: `window.visualViewport` resize event (modern browsers)
- Fallback: `focusin`/`focusout` with estimated height
- Bottom nav: Add `hidden` class when keyboard visible
- FAB: Translate up by keyboard height or hide
- Auto-scroll: `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`

---

### 9. Accessibility Enhancements

**Requirement:** R9 - Accessibility Improvements

**Approach:** Add accessibility utilities and audit existing components.

**New Utilities:**
```typescript
// src/hooks/useReducedMotion.ts
export function useReducedMotion(): boolean;

// src/utils/a11y.ts
export function announceToScreenReader(message: string): void;
export function trapFocus(container: HTMLElement): () => void;
```

**Component Updates:**
- All bottom sheets: Add `role="dialog"`, `aria-modal="true"`, focus trap
- FAB menu: Add `aria-expanded`, `aria-haspopup="menu"`
- Swipeable items: Add `aria-label` describing available actions
- All animations: Check `prefers-reduced-motion` and skip/reduce

---

### 10. Performance Optimizations

**Requirement:** R10 - Performance Optimization

**Approach:** Add debouncing, virtualization awareness, and animation performance monitoring.

**Key Implementations:**
- `useDebounce(value, delay)` hook for rapid interactions
- Skeleton loaders: Create `SkeletonCard`, `SkeletonList`, `SkeletonText` components
- Animation monitoring: Use `PerformanceObserver` for long animation frames
- Reduced motion: All animated components check `useReducedMotion()`

---

## Data Flow

### Haptic Feedback Flow
```
User Action → Component Handler → useEnhancedHaptics() → 
  ├── Native: Capacitor Haptics API
  └── Web: navigator.vibrate() fallback
  → Visual Feedback Event (optional)
```

### Bottom Sheet State Flow
```
Trigger Open → lockScroll() → animate slide-up → 
  ├── User drags → track deltaY → 
  │   ├── Release > threshold → animate close → unlockScroll()
  │   └── Release < threshold → snap back
  ├── Tap backdrop → animate close → unlockScroll()
  └── Keyboard opens → adjust height
```

### Swipe Action Flow
```
Touch Start → Track position →
  ├── Horizontal > Vertical → Begin swipe →
  │   ├── Distance > 50% → Snap to reveal
  │   ├── Distance > 100% → Auto-trigger action
  │   └── Distance < 50% → Spring back
  └── Vertical > Horizontal → Cancel swipe (allow scroll)
```

## Integration Strategy

### Phase 1: Foundation (Tasks 1-3)
- Update touch target defaults to 48px
- Create `useEnhancedHaptics` hook
- Create `useReducedMotion` hook
- Add safe area CSS utilities

### Phase 2: Core Components (Tasks 4-6)
- Build `EnhancedBottomSheet`
- Build `EnhancedFAB`
- Build `SwipeableListItem`

### Phase 3: Enhancements (Tasks 7-9)
- Enhance `PullToRefresh` with feedback
- Enhance keyboard awareness
- Add accessibility utilities

### Phase 4: Polish (Task 10)
- Performance monitoring
- Skeleton loaders
- Final integration testing

## Testing Strategy

### Unit Tests
- Hook behavior (haptics, keyboard, reduced motion)
- Component rendering (bottom sheet states, FAB variants)
- Gesture calculations (swipe thresholds, pull distances)

### Integration Tests
- Bottom sheet + keyboard interaction
- FAB + landscape orientation
- Swipe + scroll conflict resolution

### Manual Testing
- Device testing: iPhone (notch), Android (notch), Android (no notch)
- Accessibility: VoiceOver (iOS), TalkBack (Android)
- Performance: 60fps verification on mid-range devices

## Dependencies

### Existing (no new packages needed)
- `@capacitor/haptics` - Already installed
- `@capacitor/core` - Already installed
- `framer-motion` - Already installed (used in LandscapeSideRail)
- `lucide-react` - Already installed

### No New Dependencies
All improvements use existing packages and native browser APIs. No additional npm packages required.
