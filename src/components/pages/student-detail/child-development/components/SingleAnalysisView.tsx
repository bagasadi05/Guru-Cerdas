import React, { useRef } from 'react';
import { SingleAnalysisEmptyState } from './SingleAnalysisEmptyState';
import { SingleAnalysisDetailView } from './SingleAnalysisDetailView';
import { RegenerateConfirmModal } from './RegenerateConfirmModal';
import type {
  ComprehensiveChildAnalysis,
  ChildDevelopmentData,
} from '../../../../../services/childDevelopmentAnalysis';
import type {
  SubjectAverage,
  PeriodStats,
  GlanceSummary,
  DevelopmentBadges,
  ActionableRecommendationItem,
} from '../types/childDevelopmentTypes';

interface SingleAnalysisViewProps {
  studentData: ChildDevelopmentData;
  analysis: ComprehensiveChildAnalysis | null;
  generatedAt: string | null;
  overallAverage: number;
  attendanceRate: number;
  keaktifan: number;
  glanceSummary: GlanceSummary | null;
  developmentBadges: DevelopmentBadges;
  isDetailsExpanded: boolean;
  onToggleDetails: () => void;
  subjectAverages: SubjectAverage[];
  periodStats: PeriodStats;
  subjects: string[];
  studentScores: number[];
  isRadarChartValid: boolean;
  actionableRecommendations: ActionableRecommendationItem[];
  showRegenerateConfirm: boolean;
  onCancelRegenerate: () => void;
  onConfirmRegenerate: () => void;
  onGenerateAnalysis: () => void;
  onExportReport: () => void;
}

export const SingleAnalysisView: React.FC<SingleAnalysisViewProps> = ({
  studentData,
  analysis,
  generatedAt,
  overallAverage,
  attendanceRate,
  keaktifan,
  glanceSummary,
  developmentBadges,
  isDetailsExpanded,
  onToggleDetails,
  subjectAverages,
  periodStats,
  subjects,
  studentScores,
  isRadarChartValid,
  actionableRecommendations,
  showRegenerateConfirm,
  onCancelRegenerate,
  onConfirmRegenerate,
  onGenerateAnalysis,
  onExportReport,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!analysis) {
    return (
      <SingleAnalysisEmptyState
        subjectAverages={subjectAverages}
        periodStats={periodStats}
        studentScores={studentScores}
        subjects={subjects}
        overallAverage={overallAverage}
        isRadarChartValid={isRadarChartValid}
        onGenerateAnalysis={onGenerateAnalysis}
      />
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <SingleAnalysisDetailView
        analysis={analysis}
        studentData={studentData}
        overallAverage={overallAverage}
        attendanceRate={attendanceRate}
        keaktifan={keaktifan}
        generatedAt={generatedAt}
        glanceSummary={glanceSummary}
        developmentBadges={developmentBadges}
        isDetailsExpanded={isDetailsExpanded}
        onToggleDetails={onToggleDetails}
        periodStats={periodStats}
        subjects={subjects}
        studentScores={studentScores}
        subjectAverages={subjectAverages}
        isRadarChartValid={isRadarChartValid}
        actionableRecommendations={actionableRecommendations}
        onExportReport={onExportReport}
        onGenerateAnalysis={onGenerateAnalysis}
      />

      {/* Regenerate Confirmation Modal */}
      <RegenerateConfirmModal
        isOpen={showRegenerateConfirm}
        title="Regenerate Analisis?"
        description="Analisis baru akan menggantikan analisis sebelumnya. Lanjutkan?"
        onConfirm={onConfirmRegenerate}
        onCancel={onCancelRegenerate}
      />
    </div>
  );
};
