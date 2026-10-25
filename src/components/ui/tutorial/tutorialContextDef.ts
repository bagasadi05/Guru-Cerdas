import { createContext } from 'react';
import type { TutorialContextValue } from './types';

export const TutorialContext = createContext<TutorialContextValue | null>(null);
