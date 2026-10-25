import React, { useState, useEffect, useCallback } from 'react';
import type { TutorialFlow, TutorialContextValue } from './types';
import { tutorialFlows } from './tutorialFlowsData';
import { getCompletedFlows, markFlowCompleted } from './tutorialStorage';
import { TutorialContext } from './tutorialContextDef';
import { TutorialOverlay } from './TutorialOverlay';

interface InteractiveTutorialProviderProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
}

export const InteractiveTutorialProvider: React.FC<InteractiveTutorialProviderProps> = ({
  children,
  onNavigate,
}) => {
  const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedFlows, setCompletedFlows] = useState<string[]>(getCompletedFlows);

  const startFlow = useCallback((flowId: string) => {
    const flow = tutorialFlows.find((f) => f.id === flowId);
    if (flow) {
      setCurrentFlow(flow);
      setCurrentStepIndex(0);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (!currentFlow) return;
    if (currentStepIndex < currentFlow.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Flow completed
      markFlowCompleted(currentFlow.id);
      setCompletedFlows(getCompletedFlows());
      setCurrentFlow(null);
      setCurrentStepIndex(0);
    }
  }, [currentFlow, currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipFlow = useCallback(() => {
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  }, []);

  const endFlow = useCallback(() => {
    if (currentFlow) {
      markFlowCompleted(currentFlow.id);
      setCompletedFlows(getCompletedFlows());
    }
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  }, [currentFlow]);

  // Handle navigation
  const currentStep = currentFlow?.steps[currentStepIndex];
  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.route && currentStep.action === 'navigate') {
      onNavigate(currentStep.route);
      const timer = setTimeout(nextStep, 600);
      return () => clearTimeout(timer);
    } else if (currentStep.route) {
      onNavigate(currentStep.route);
    }
  }, [currentStep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentFlow) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipFlow();
      else if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentFlow, nextStep, prevStep, skipFlow]);

  const value: TutorialContextValue = {
    isActive: !!currentFlow,
    currentFlow,
    currentStepIndex,
    completedFlows,
    startFlow,
    nextStep,
    prevStep,
    skipFlow,
    endFlow,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {currentFlow && currentStep && currentStep.action !== 'navigate' && (
        <TutorialOverlay
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={currentFlow.steps.length}
          flowTitle={currentFlow.title}
          isLastStep={currentStepIndex === currentFlow.steps.length - 1}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipFlow}
          onEnd={endFlow}
        />
      )}
    </TutorialContext.Provider>
  );
};
