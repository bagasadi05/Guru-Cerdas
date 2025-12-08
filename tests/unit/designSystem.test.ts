import { describe, it, expect } from 'vitest';
import designSystem from '../../src/styles/designSystem';

describe('Design System', () => {
    describe('Spacing', () => {
        it('should have consistent 4px base unit', () => {
            expect(designSystem.spacing[1]).toBe('0.25rem'); // 4px
            expect(designSystem.spacing[2]).toBe('0.5rem');  // 8px
            expect(designSystem.spacing[4]).toBe('1rem');    // 16px
        });

        it('should have semantic spacing tokens', () => {
            const { spacingTokens } = designSystem;
            expect(spacingTokens.componentPaddingSm).toBe('0.5rem');  // 8px
            expect(spacingTokens.componentPaddingMd).toBe('0.75rem'); // 12px
            expect(spacingTokens.componentPaddingLg).toBe('1rem');    // 16px
        });

        it('should have gap tokens', () => {
            const { spacingTokens } = designSystem;
            expect(spacingTokens.gapXs).toBe('0.25rem');
            expect(spacingTokens.gapSm).toBe('0.5rem');
            expect(spacingTokens.gapMd).toBe('0.75rem');
        });

        it('should have page margin tokens', () => {
            const { spacingTokens } = designSystem;
            expect(spacingTokens.pageMarginMobile).toBe('1rem');     // 16px
            expect(spacingTokens.pageMarginDesktop).toBe('1.5rem');  // 24px
        });
    });

    describe('Border Radius', () => {
        it('should have standardized values', () => {
            const { borderRadius } = designSystem;
            expect(borderRadius.sm).toBe('0.25rem');   // 4px
            expect(borderRadius.md).toBe('0.5rem');    // 8px
            expect(borderRadius.lg).toBe('0.75rem');   // 12px
            expect(borderRadius.xl).toBe('1rem');      // 16px
        });

        it('should have semantic radius tokens', () => {
            const { radiusTokens } = designSystem;
            expect(radiusTokens.button).toBe('0.75rem');
            expect(radiusTokens.card).toBe('1rem');
            expect(radiusTokens.modal).toBe('1.25rem');
        });

        it('should have full radius for pills', () => {
            expect(designSystem.borderRadius.full).toBe('9999px');
            expect(designSystem.radiusTokens.chip).toBe('9999px');
        });
    });

    describe('Shadows', () => {
        it('should have shadow scale', () => {
            const { shadows } = designSystem;
            expect(shadows.none).toBe('none');
            expect(shadows.sm).toBeDefined();
            expect(typeof shadows.sm).toBe('string');
        });

        it('should have semantic shadow tokens', () => {
            const { shadowTokens } = designSystem;
            expect(shadowTokens.button).toBe(designSystem.shadows.sm);
            expect(shadowTokens.modal).toBe(designSystem.shadows['2xl']);
        });
    });

    describe('Typography', () => {
        it('should have font size scale', () => {
            const { fontSize } = designSystem;
            expect(fontSize.xs[0]).toBe('0.75rem');   // 12px
            expect(fontSize.sm[0]).toBe('0.875rem');  // 14px
            expect(fontSize.base[0]).toBe('1rem');    // 16px
        });

        it('should have font weight scale', () => {
            const { fontWeight } = designSystem;
            expect(fontWeight.normal).toBe('400');
            expect(fontWeight.medium).toBe('500');
            expect(fontWeight.semibold).toBe('600');
            expect(fontWeight.bold).toBe('700');
        });

        it('should have heading typography tokens', () => {
            const { typographyTokens } = designSystem;
            expect(typographyTokens.h1.weight).toBe('700');
            expect(typographyTokens.h3.weight).toBe('600');
        });

        it('should have body typography tokens', () => {
            const { typographyTokens } = designSystem;
            expect(typographyTokens.body.size).toBe('1rem');
            expect(typographyTokens.bodySm.size).toBe('0.875rem');
        });
    });

    describe('Colors', () => {
        it('should have primary color scale', () => {
            const { colors } = designSystem;
            expect(colors.primary[500]).toBe('#6366f1');
            expect(colors.primary[600]).toBe('#4f46e5');
        });

        it('should have neutral color scale', () => {
            const { colors } = designSystem;
            expect(colors.neutral[900]).toBe('#0f172a');
            expect(colors.neutral[50]).toBe('#f8fafc');
        });

        it('should have semantic colors', () => {
            const { colors } = designSystem;
            expect(colors.success.main).toBe('#10b981');
            expect(colors.error.main).toBe('#ef4444');
            expect(colors.warning.main).toBe('#f59e0b');
        });

        it('should have color tokens', () => {
            const { colorTokens } = designSystem;
            expect(colorTokens.bgDefault).toBe('#f8fafc');
            expect(colorTokens.textPrimary).toBe('#0f172a');
        });
    });

    describe('Transitions', () => {
        it('should have duration scale', () => {
            const { transitions } = designSystem;
            expect(transitions.fast).toBe('150ms');
            expect(transitions.normal).toBe('200ms');
            expect(transitions.slow).toBe('300ms');
        });

        it('should have easing functions', () => {
            const { easings } = designSystem;
            expect(easings.default).toContain('cubic-bezier');
            expect(easings.spring).toContain('cubic-bezier');
        });
    });

    describe('Z-Index', () => {
        it('should have z-index scale', () => {
            const { zIndex } = designSystem;
            expect(zIndex.base).toBe(0);
            expect(zIndex.dropdown).toBe(10);
            expect(zIndex.modal).toBe(50);
            expect(zIndex.toast).toBe(70);
            expect(zIndex.max).toBe(100);
        });

        it('should have correct stacking order', () => {
            const { zIndex } = designSystem;
            expect(zIndex.modal).toBeGreaterThan(zIndex.dropdown);
            expect(zIndex.toast).toBeGreaterThan(zIndex.modal);
        });
    });

    describe('Breakpoints', () => {
        it('should have breakpoint scale', () => {
            const { breakpoints } = designSystem;
            expect(breakpoints.sm).toBe('640px');
            expect(breakpoints.md).toBe('768px');
            expect(breakpoints.lg).toBe('1024px');
        });
    });

    describe('Component Presets', () => {
        it('should have button size presets', () => {
            const { componentPresets } = designSystem;
            expect(componentPresets.buttonSizes.sm.minHeight).toBe('36px');
            expect(componentPresets.buttonSizes.md.minHeight).toBe('44px');
            expect(componentPresets.buttonSizes.lg.minHeight).toBe('52px');
        });

        it('should have card variant presets', () => {
            const { componentPresets } = designSystem;
            expect(componentPresets.cardVariants.default.borderRadius).toBe('1rem');
            expect(componentPresets.cardVariants.outlined.border).toContain('solid');
        });

        it('should have input size presets', () => {
            const { componentPresets } = designSystem;
            expect(componentPresets.inputSizes.md.minHeight).toBe('44px');
        });
    });
});
