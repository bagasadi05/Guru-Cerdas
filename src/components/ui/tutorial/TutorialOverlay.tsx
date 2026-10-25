import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronRight,
  ChevronLeft,
  MousePointerClick,
  Eye,
  Hand,
  SkipForward,
  Target,
  Trophy,
  Timer,
  Keyboard,
} from 'lucide-react';
import { Button } from '../Button';
import type { GuidedStep } from './types';
import { tutorialFlows } from './tutorialFlowsData';
import { useTutorialSpotlight } from './useTutorialSpotlight';

interface TutorialOverlayProps {
  step: GuidedStep;
  stepIndex: number;
  totalSteps: number;
  flowTitle: string;
  isLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onEnd: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  stepIndex,
  totalSteps,
  flowTitle,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onEnd,
}) => {
  const { targetRect, targetFound, countdown, getTooltipStyle } = useTutorialSpotlight({
    step,
    onNext,
  });

  const getActionIcon = () => {
    switch (step.action) {
      case 'click':
        return <MousePointerClick className="w-4 h-4" />;
      case 'observe':
        return <Eye className="w-4 h-4" />;
      case 'interact':
        return <Hand className="w-4 h-4" />;
      case 'scroll':
        return <Target className="w-4 h-4" />;
      default:
        return <Eye className="w-4 h-4" />;
    }
  };

  const getActionColor = () => {
    switch (step.action) {
      case 'click':
        return 'text-brand-500 bg-brand-50 dark:bg-brand-900/30';
      case 'observe':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
      case 'interact':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-900/30';
    }
  };

  const getActionLabel = () => {
    switch (step.action) {
      case 'click':
        return '👆 Klik elemen yang berkedip';
      case 'observe':
        return '👀 Perhatikan area yang ditandai';
      case 'interact':
        return '✍️ Coba ketik atau interaksi';
      case 'scroll':
        return '📜 Scroll untuk melihat';
      default:
        return '';
    }
  };

  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const displayInstruction =
    !targetFound && step.fallbackInstruction ? step.fallbackInstruction : step.instruction;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial interaktif"
    >
      {targetRect && targetFound ? (
        <>
          {/* Spotlight: the box-shadow creates the dark overlay AND the bright cutout in one element */}
          <div
            className="absolute pointer-events-none transition-all duration-500 ease-out"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              borderRadius: '14px',
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
            }}
          />

          {/* Glowing animated ring around the target */}
          <div
            className={`absolute pointer-events-none rounded-2xl transition-all duration-500 ease-out tutorial-spotlight-ring tutorial-ring-${step.action}`}
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />

          {/* Animated pointer hint for click/interact actions */}
          {(step.action === 'click' || step.action === 'interact') && (
            <div
              className="absolute pointer-events-none z-10 tutorial-hand-pointer"
              style={{
                top: targetRect.bottom - 4,
                left: targetRect.left + targetRect.width / 2 - 12,
              }}
            >
              <MousePointerClick
                className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                fill="rgba(13,126,158,0.9)"
              />
            </div>
          )}

          {/* Clickable transparent area over target so user can interact with it */}
          <div
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        </>
      ) : (
        /* No target found yet: light dim that lets user interact with the page */
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(15, 23, 42, 0.35)' }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="absolute w-[350px] max-w-[calc(100vw-24px)] pointer-events-auto transition-all duration-500 ease-out"
        style={getTooltipStyle()}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/20 border border-slate-200/80 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">
                {tutorialFlows.find((f) => f.title === flowTitle)?.icon || '📖'}
              </span>
              <span className="text-white/90 text-xs font-semibold truncate">{flowTitle}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/60 text-xxs font-mono">
                {stepIndex + 1}/{totalSteps}
              </span>
              <button
                type="button"
                onClick={onSkip}
                className="p-1 rounded-md hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                aria-label="Tutup tutorial (Esc)"
                title="Tutup (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Step title & instruction */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getActionColor()}`}
              >
                {getActionIcon()}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">
                  {step.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {displayInstruction}
                </p>
              </div>
            </div>

            {/* Action hint badge */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 mb-3">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                {getActionLabel()}
              </span>
              {countdown !== null && (
                <span className="flex items-center gap-1 text-xxs text-slate-400 font-mono">
                  <Timer className="w-3 h-3" />
                  {countdown}s
                </span>
              )}
            </div>

            {/* Progress */}
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-700 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onPrev}
                disabled={stepIndex === 0}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Kembali
              </button>

              <div className="flex items-center gap-2">
                {step.advanceOnTargetClick && (
                  <button
                    type="button"
                    onClick={onNext}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <SkipForward className="w-3 h-3" />
                    Lewati
                  </button>
                )}
                {!step.advanceOnTargetClick && (
                  <Button
                    onClick={isLastStep ? onEnd : onNext}
                    size="sm"
                    className="text-xs px-3 py-1.5 h-auto min-w-0"
                  >
                    {isLastStep ? (
                      <>
                        <Trophy className="w-3.5 h-3.5 mr-1" />
                        Selesai!
                      </>
                    ) : (
                      <>
                        Lanjut
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-center gap-3 text-xxs text-slate-400">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3 h-3" /> ← → navigasi
              </span>
              <span>Esc tutup</span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion celebration */}
      {isLastStep && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-bounce">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold">Langkah terakhir! 🎉</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
