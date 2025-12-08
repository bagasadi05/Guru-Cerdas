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

        // Use screen.orientation if available (more reliable)
        if (window.screen?.orientation?.type) {
            return window.screen.orientation.type.includes('landscape') ? 'landscape' : 'portrait';
        }

        // Fallback to matchMedia
        if (window.matchMedia('(orientation: landscape)').matches) {
            return 'landscape';
        }

        // Fallback to window dimensions
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
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
