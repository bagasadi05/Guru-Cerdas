/**
 * Interactive Tutorial System
 *
 * Facade entry point preserving 100% backward compatibility
 * across all existing imports.
 */

export {
  InteractiveTutorialProvider,
  useInteractiveTutorial,
  TutorialPicker,
  resetTutorialProgress,
  getCompletedFlows,
  markFlowCompleted,
  tutorialFlows,
  type GuidedStep,
  type TutorialFlow,
  type TutorialContextValue,
  type StepAction,
} from './tutorial';

export { InteractiveTutorialProvider as default } from './tutorial';
