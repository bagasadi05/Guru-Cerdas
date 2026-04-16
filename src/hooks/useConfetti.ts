import { useCallback } from 'react';
import { triggerConfetti as triggerBasicConfetti, triggerFireworks } from '../utils/confetti';

export const useConfetti = () => {
    const triggerConfetti = useCallback(() => {
        triggerFireworks();
    }, []);

    const triggerSmallConfetti = useCallback(() => {
        triggerBasicConfetti();
    }, []);

    return { triggerConfetti, triggerSmallConfetti };
};
