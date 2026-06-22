/**
 * useOrientation Hook
 * 
 * Detects and tracks device orientation (landscape/portrait).
 * Useful for responsive layouts that need to adapt to orientation changes.
 * 
 * @returns {Object} - { isLandscape, isPortrait, orientation }
 */

import { useState, useEffect } from 'react';

export type Orientation = 'landscape' | 'portrait';

interface UseOrientationReturn {
    isLandscape: boolean;
    isPortrait: boolean;
    orientation: Orientation;
}

export const useOrientation = (): UseOrientationReturn => {
    const getOrientation = (): Orientation => {
        if (typeof window === 'undefined') return 'portrait';

        // Use the CSS/layout VIEWPORT orientation as the source of truth.
        // This is what actually drives the responsive layout (Tailwind
        // breakpoints, flex columns, etc.).
        //
        // NOTE: window.screen.orientation.type describes the PHYSICAL device
        // screen, not the rendered viewport. On devices whose natural
        // orientation is landscape (some tablets/foldables) or in DevTools
        // device emulation it can report 'landscape' even while the app is
        // rendered in a portrait-shaped viewport. Because the mobile bottom
        // navigation is only mounted when isPortrait is true, relying on
        // screen.orientation made the bottom navbar disappear in those cases.
        if (typeof window.matchMedia === 'function') {
            if (window.matchMedia('(orientation: portrait)').matches) {
                return 'portrait';
            }
            if (window.matchMedia('(orientation: landscape)').matches) {
                return 'landscape';
            }
        }

        // Fallback to viewport dimensions (portrait wins on a square viewport).
        return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
    };

    const [orientation, setOrientation] = useState<Orientation>(getOrientation);

    useEffect(() => {
        const handleOrientationChange = () => {
            const newOrientation = getOrientation();
            setOrientation(newOrientation);
        };

        // Listen to orientation change via screen.orientation API
        if (window.screen?.orientation) {
            window.screen.orientation.addEventListener('change', handleOrientationChange);
        }

        // Fallback: Listen to resize events
        window.addEventListener('resize', handleOrientationChange);

        // Also listen to orientation change event (deprecated but still supported)
        window.addEventListener('orientationchange', handleOrientationChange);

        // Initial check
        handleOrientationChange();

        return () => {
            if (window.screen?.orientation) {
                window.screen.orientation.removeEventListener('change', handleOrientationChange);
            }
            window.removeEventListener('resize', handleOrientationChange);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    return {
        isLandscape: orientation === 'landscape',
        isPortrait: orientation === 'portrait',
        orientation,
    };
};

export default useOrientation;
