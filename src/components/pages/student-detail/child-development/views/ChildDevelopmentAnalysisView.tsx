import React, { useState } from 'react';
import { useSemester } from '../../../../../contexts/SemesterContext';
import { useUserSettings } from '../../../../../hooks/useUserSettings';
import {
  LoadingProgress,
  CompLoadingProgress,
  SegmentedModeControl,
  SingleAnalysisView,
  RegenerateConfirmModal,
} from '../components';
import { ComparativeAnalysisView } from './ComparativeAnalysisView';
import { useSingleChildAnalysis, useComparativeChildAnalysis } from '../hooks';
import type { ChildDevelopmentAnalysisTabProps } from '../types/childDevelopmentTypes';

export const ChildDevelopmentAnalysisView: React.FC<ChildDevelopmentAnalysisTabProps> = ({
  studentData,
  allAcademicRecords = [],
  allAttendanceRecords = [],
  allViolations = [],
  allQuizPoints = [],
  defaultMode = 'single',
  selectedSemesterId = null,
  selectedAcademicYearId = null,
}) => {
  const { activeAcademicYear, semesters } = useSemester();
  const { schoolName } = useUserSettings();
  const [activeTabMode, setActiveTabMode] = useState<'single' | 'comparative'>(defaultMode);

  const singleAnalysis = useSingleChildAnalysis({
    studentData,
    selectedSemesterId,
    selectedAcademicYearId,
    semesters,
    activeAcademicYear,
    schoolName,
  });

  const compAnalysis = useComparativeChildAnalysis({
    studentData,
    allAcademicRecords,
    allAttendanceRecords,
    allViolations,
    allQuizPoints,
    activeAcademicYear,
    semesters,
    schoolName,
  });

  if (singleAnalysis.isLoading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <LoadingProgress currentStep={singleAnalysis.loadingStep} />
      </div>
    );
  }

  if (compAnalysis.isCompLoading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-8">
        <CompLoadingProgress currentStep={compAnalysis.compLoadingStep} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <SegmentedModeControl activeTabMode={activeTabMode} onTabChange={setActiveTabMode} />

      {activeTabMode === 'comparative' ? (
        <>
          <ComparativeAnalysisView
            studentData={studentData}
            activeAcademicYear={activeAcademicYear}
            avgScoreSem1={compAnalysis.avgScoreSem1}
            avgScoreSem2={compAnalysis.avgScoreSem2}
            avgScoreDiff={compAnalysis.avgScoreDiff}
            sem1Academic={compAnalysis.sem1Academic}
            sem2Academic={compAnalysis.sem2Academic}
            sem1Quizzes={compAnalysis.sem1Quizzes}
            sem2Quizzes={compAnalysis.sem2Quizzes}
            compAttendanceStats={compAnalysis.compAttendanceStats}
            compViolationStats={compAnalysis.compViolationStats}
            compSubjectAverages={compAnalysis.compSubjectAverages}
            compHolisticDimensions={compAnalysis.compHolisticDimensions}
            comparativeAnalysis={compAnalysis.comparativeAnalysis}
            compGeneratedAt={compAnalysis.compGeneratedAt}
            onGenerateComparativeAnalysis={compAnalysis.handleGenerateComparativeAnalysis}
            onExportComparativeReport={compAnalysis.handleExportComparativeReport}
          />

          <RegenerateConfirmModal
            isOpen={compAnalysis.showCompRegenerateConfirm}
            title="Regenerate Analisis Perbandingan?"
            description="Analisis perbandingan baru akan menggantikan analisis sebelumnya. Lanjutkan?"
            onConfirm={compAnalysis.doGenerateComparativeAnalysis}
            onCancel={() => compAnalysis.setShowCompRegenerateConfirm(false)}
          />
        </>
      ) : (
        <SingleAnalysisView
          studentData={studentData}
          analysis={singleAnalysis.analysis}
          generatedAt={singleAnalysis.generatedAt}
          overallAverage={singleAnalysis.overallAverage}
          attendanceRate={singleAnalysis.attendanceRate}
          keaktifan={singleAnalysis.keaktifan}
          glanceSummary={singleAnalysis.glanceSummary}
          developmentBadges={singleAnalysis.developmentBadges}
          isDetailsExpanded={singleAnalysis.isDetailsExpanded}
          onToggleDetails={() =>
            singleAnalysis.setIsDetailsExpanded(!singleAnalysis.isDetailsExpanded)
          }
          subjectAverages={singleAnalysis.subjectAverages}
          periodStats={singleAnalysis.periodStats}
          subjects={singleAnalysis.subjects}
          studentScores={singleAnalysis.studentScores}
          isRadarChartValid={singleAnalysis.isRadarChartValid}
          actionableRecommendations={singleAnalysis.actionableRecommendations}
          showRegenerateConfirm={singleAnalysis.showRegenerateConfirm}
          onCancelRegenerate={() => singleAnalysis.setShowRegenerateConfirm(false)}
          onConfirmRegenerate={singleAnalysis.doGenerateAnalysis}
          onGenerateAnalysis={singleAnalysis.handleGenerateAnalysis}
          onExportReport={singleAnalysis.handleExportReport}
        />
      )}
    </div>
  );
};
