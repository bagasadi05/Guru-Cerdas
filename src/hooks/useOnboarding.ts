import { useState, useEffect } from 'react';

/**
 * Hook to manage onboarding tour visibility and completion state.
 * Stored in localStorage under 'onboarding_completed'.
 */
export const useOnboarding = () => {
    const [showTour, setShowTour] = useState(false);

    useEffect(() => {
        // Check if onboarding has been completed
        const completed = localStorage.getItem('onboarding_completed');
        if (!completed) {
            // Delay showing tour to let page load
            const timer = setTimeout(() => setShowTour(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const startTour = () => {
        localStorage.removeItem('onboarding_completed');
        setShowTour(true);
    };
    const endTour = () => setShowTour(false);
    const resetTour = () => {
        localStorage.removeItem('onboarding_completed');
        setShowTour(true);
    };

    return { showTour, startTour, endTour, resetTour };
};

export default useOnboarding;
