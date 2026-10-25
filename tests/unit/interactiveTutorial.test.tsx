import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  InteractiveTutorialProvider,
  useInteractiveTutorial,
  TutorialPicker,
  tutorialFlows,
  resetTutorialProgress,
} from '../../src/components/ui/InteractiveTutorial';

const TestConsumer = () => {
  const { currentFlow, currentStepIndex, startFlow, completedFlows, isActive } =
    useInteractiveTutorial();

  return (
    <div>
      <span data-testid="is-active">{isActive ? 'yes' : 'no'}</span>
      <span data-testid="flow-id">{currentFlow?.id || 'none'}</span>
      <span data-testid="step-index">{currentStepIndex}</span>
      <span data-testid="completed-count">{completedFlows.length}</span>
      <button onClick={() => startFlow('dashboard-tour')}>Start Dashboard Tour</button>
    </div>
  );
};

describe('InteractiveTutorial System', () => {
  beforeEach(() => {
    localStorage.clear();
    resetTutorialProgress();
    vi.clearAllMocks();
  });

  describe('tutorialFlows data', () => {
    it('contains all 10 expected flows with valid structure', () => {
      expect(tutorialFlows.length).toBe(10);
      tutorialFlows.forEach((flow) => {
        expect(flow.id).toBeTruthy();
        expect(flow.title).toBeTruthy();
        expect(flow.steps.length).toBeGreaterThan(0);
        flow.steps.forEach((step) => {
          expect(step.id).toBeTruthy();
          expect(step.title).toBeTruthy();
          expect(step.instruction).toBeTruthy();
          expect(['observe', 'click', 'navigate', 'scroll', 'interact']).toContain(step.action);
        });
      });
    });
  });

  describe('InteractiveTutorialProvider & Context', () => {
    it('throws error when hook is used outside of provider', () => {
      const BadComponent = () => {
        useInteractiveTutorial();
        return null;
      };

      // Suppress console.error for expected react error boundary
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<BadComponent />)).toThrow(
        'useInteractiveTutorial must be used within InteractiveTutorialProvider'
      );
      spy.mockRestore();
    });

    it('manages flow state when started from consumer', () => {
      const handleNavigate = vi.fn();
      render(
        <InteractiveTutorialProvider onNavigate={handleNavigate}>
          <TestConsumer />
        </InteractiveTutorialProvider>
      );

      expect(screen.getByTestId('is-active').textContent).toBe('no');
      expect(screen.getByTestId('flow-id').textContent).toBe('none');

      fireEvent.click(screen.getByText('Start Dashboard Tour'));

      expect(screen.getByTestId('is-active').textContent).toBe('yes');
      expect(screen.getByTestId('flow-id').textContent).toBe('dashboard-tour');
      expect(screen.getByTestId('step-index').textContent).toBe('0');
    });
  });

  describe('TutorialPicker', () => {
    it('renders flows and filters by category', () => {
      const handleClose = vi.fn();
      const handleNavigate = vi.fn();

      render(
        <InteractiveTutorialProvider onNavigate={handleNavigate}>
          <TutorialPicker isOpen={true} onClose={handleClose} />
        </InteractiveTutorialProvider>
      );

      expect(screen.getByText('Tutorial Praktik')).toBeInTheDocument();
      expect(screen.getByText('Jelajahi Dashboard')).toBeInTheDocument();

      // Filter by dasar
      fireEvent.click(screen.getByText('⭐ Dasar'));
      expect(screen.getByText('Jelajahi Dashboard')).toBeInTheDocument();

      // Filter by lanjutan
      fireEvent.click(screen.getByText('🚀 Lanjutan'));
      expect(screen.getByText('Gunakan Brankas Kelas')).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByLabelText('Tutup');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
