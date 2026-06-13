import React from 'react';
import { ChildDevelopmentData } from '../../../../services/childDevelopmentAnalysis';
import { ChildDevelopmentAnalysisView } from './views/ChildDevelopmentAnalysisView';

interface ChildDevelopmentAnalysisTabProps {
  studentData: ChildDevelopmentData;
  allAcademicRecords?: any[];
  allAttendanceRecords?: any[];
  allViolations?: any[];
  allQuizPoints?: any[];
  selectedSemesterId?: string | null;
  selectedAcademicYearId?: string | null;
}

export const ChildDevelopmentAnalysisTab: React.FC<ChildDevelopmentAnalysisTabProps> = (props) => {
  return (
    <ChildDevelopmentAnalysisView {...props} defaultMode="single" />
  );
};
