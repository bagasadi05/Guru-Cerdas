# Tasks

## Task 1: Update Touch Target Defaults and Add Press Feedback

- [x] Update `TouchTarget` component in `src/utils/mobileUX.tsx` to use 48px as default `minSize` instead of 44px
- [x] Add `active:scale-[0.95] transition-transform` CSS classes to `TouchTarget` for press feedback
- [x] Update `auditTouchTargets()` in `src/hooks/useMobileUX.tsx` to check against 48px threshold
- [x] Add `.touch-target-group` utility class with `gap-2` (8px spacing) to global CSS
- [x] Update `LoadingButton` in `src/utils/mobileUX.tsx` to use `min-h-[48px]` instead of `min-h-[44px]`

## Task 2: Create Enhanced Haptic Feedback Hook

- [x] Create `src/hooks/useEnhancedHaptics.ts` with pattern-based haptic feedback
- [x] Implement `tap()` pattern: ImpactStyle.Light on native, vibrate([10]) on web
- [x] Implement `select()` pattern: ImpactStyle.Medium on native, vibrate([20]) on web
- [x] Implement `success()` pattern: NotificationType.Success on native, vibrate([10, 50, 10]) on web
- [x] Implement `warning()` pattern: NotificationType.Warning on native, vibrate([15, 100, 15, 100, 15]) on web
- [x] Implement `error()` pattern: NotificationType.Error on native, vibrate([50, 50, 50]) on web
- [x] Add silent failure handling for devices without vibration support
- [x] Export both the hook `useEnhancedHaptics()` and standalone functions

## Task 3: Create useReducedMotion Hook and Safe Area CSS Utilities

- [x] Create `src/hooks/useReducedMotion.ts` that reads `prefers-reduced-motion` media query
- [x] Add safe area CSS utility classes (`.pb-safe`, `.pt-safe`, `.pl-safe`, `.pr-safe`, `.mb-safe`, `.mt-safe`) to `src/index.css`
- [x] Verify `index.html` has `viewport-fit=cover` in the viewport meta tag
- [x] Update `useSafeAreaInsets` in `src/utils/mobileUX.tsx` to use CSS custom properties with proper fallbacks

## Task 4: Build Enhanced Bottom Sheet Component

Depends on: Task 1, Task 2, Task 3

- [x] Create `src/components/mobile/EnhancedBottomSheet.tsx` with props: `isOpen`, `onClose`, `title`, `subtitle`, `maxHeight`, `showDragHandle`, `closeOnBackdrop`, `keyboardAware`
- [x] Implement slide-up animation with `cubic-bezier(0.32, 0.72, 0, 1)` easing
- [x] Add drag handle (32x4px rounded pill) at top of sheet
- [x] Implement swipe-down-to-dismiss gesture with 100px or 30% threshold
- [x] Add backdrop tap-to-close functionality
- [x] Implement independent content scrolling with `overscroll-behavior: contain`
- [x] Add keyboard awareness using `visualViewport` resize event
- [x] Limit max height to 70vh with internal scrolling
- [x] Use `lockScroll`/`unlockScroll` from mobileUX utilities
- [x] Add focus trap and `role="dialog"` with `aria-modal="true"` for accessibility
- [x] Integrate haptic feedback on open/close

## Task 5: Build Enhanced Floating Action Button Component

Depends on: Task 2, Task 3

- [x] Create `src/components/mobile/EnhancedFAB.tsx` with Material Design 3 sizing (56x56px primary, 40x40px secondary)
- [x] Implement expandable menu with up to 4 action items (48x48px touch targets each)
- [x] Add staggered scale-in animation for menu items (50ms delay per item)
- [x] Add scale-down animation on menu close (200ms)
- [x] Integrate haptic feedback (20ms vibration on tap)
- [x] Position above bottom nav in portrait: `bottom: calc(80px + env(safe-area-inset-bottom))`
- [x] Offset from side rail in landscape: `right: calc(80px + 16px)`
- [x] Hide or move up when keyboard is visible using `useKeyboardAwareness`
- [x] Add `aria-expanded`, `aria-haspopup="menu"` for accessibility
- [x] Support `useReducedMotion` to skip animations when preferred
- [x] Add backdrop overlay when menu is expanded

## Task 6: Build Swipeable List Item Component

Depends on: Task 2, Task 3

- [x] Create `src/components/mobile/SwipeableListItem.tsx` with left and right swipe actions
- [x] Implement touch tracking with horizontal vs vertical detection (10px dead zone)
- [x] Add visual feedback during swipe (background color reveal behind item)
- [x] Implement snap-to-reveal when swipe distance > 50% of threshold
- [x] Implement auto-trigger when swipe distance > 100px threshold
- [x] Add spring-back animation when released below 50% threshold
- [x] Prioritize vertical scrolling over horizontal swipe gestures
- [x] Disable swipe gestures in landscape orientation (check `matchMedia`)
- [x] Add haptic feedback on action reveal and trigger
- [x] Add `aria-label` describing available swipe actions for accessibility

## Task 7: Enhance Pull-to-Refresh with Feedback

Depends on: Task 2

- [x] Update `src/components/ui/PullToRefresh.tsx` to show success toast "Data berhasil diperbarui" on successful refresh
- [x] Add error toast "Gagal memperbarui data" with retry button on refresh failure
- [x] Integrate `useEnhancedHaptics` success pattern on refresh complete
- [x] Integrate `useEnhancedHaptics` error pattern on refresh failure
- [x] Add smooth spring-back animation when released below threshold
- [x] Ensure pull-to-refresh is disabled during active refresh (already exists, verify)
- [x] Add `useReducedMotion` check to reduce animation intensity

## Task 8: Enhance Keyboard Awareness

Depends on: Task 3

- [x] Create `src/hooks/useKeyboardAwareness.ts` with options for hiding bottom nav, hiding FAB, and auto-scrolling
- [x] Implement `visualViewport` resize detection as primary method
- [x] Implement `focusin`/`focusout` fallback for older browsers
- [x] Add logic to hide bottom navigation when keyboard is visible
- [x] Add logic to hide/move FAB when keyboard is visible
- [x] Implement auto-scroll to focused input with configurable offset
- [x] Add form validation scroll-to-first-error support
- [x] Restore original view state when keyboard is dismissed

## Task 9: Add Accessibility Utilities

Depends on: Task 3

- [x] Create `src/utils/a11y.ts` with `announceToScreenReader(message)` using aria-live region
- [x] Add `trapFocus(container)` utility that returns a cleanup function
- [x] Create visible focus indicator styles (2px ring with offset) in global CSS
- [x] Ensure all new components (EnhancedBottomSheet, EnhancedFAB, SwipeableListItem) have proper ARIA attributes
- [x] Add `aria-live="polite"` region to app root for dynamic announcements
- [x] Verify color contrast ratios meet 4.5:1 for normal text and 3:1 for large text in new components

## Task 10: Performance Optimizations and Skeleton Loaders

Depends on: Task 4, Task 5, Task 6, Task 7, Task 8, Task 9

- [x] Create `src/components/ui/SkeletonLoader.tsx` with variants: `SkeletonCard`, `SkeletonList`, `SkeletonText`, `SkeletonAvatar`
- [x] Add `useDebounce` hook to `src/hooks/useDebounce.ts` for rapid interaction debouncing
- [x] Ensure all animated components check `useReducedMotion()` and provide reduced alternatives
- [x] Add CSS `will-change` hints for frequently animated elements (bottom sheet, FAB, swipeable items)
- [x] Verify all animations use `transform` and `opacity` only for GPU acceleration
- [x] Add performance monitoring utility using `PerformanceObserver` for long animation frames
