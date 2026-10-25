export type StepAction =
  | 'observe'
  | 'click'
  | 'navigate'
  | 'scroll'
  | 'interact';

export interface GuidedStep {
  id: string;
  target?: string;
  route?: string;
  title: string;
  instruction: string;
  action: StepAction;
  autoAdvanceMs?: number;
  advanceOnTargetClick?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  waitFor?: string;
  /** Fallback instruction if target not found */
  fallbackInstruction?: string;
}

export interface TutorialFlow {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'dasar' | 'lanjutan';
  steps: GuidedStep[];
}

export interface TutorialContextValue {
  isActive: boolean;
  currentFlow: TutorialFlow | null;
  currentStepIndex: number;
  completedFlows: string[];
  startFlow: (flowId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipFlow: () => void;
  endFlow: () => void;
}
