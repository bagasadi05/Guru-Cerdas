import { useContext } from 'react';
import { TutorialContext } from './tutorialContextDef';
import type { TutorialContextValue } from './types';

export const useInteractiveTutorial = (): TutorialContextValue => {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useInteractiveTutorial must be used within InteractiveTutorialProvider');
  }
  return ctx;
};
