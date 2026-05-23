import React, { useState } from 'react';
import { ChildDevelopmentData } from '../../../../services/childDevelopmentAnalysis';
import { SingleAnalysisView } from './views/SingleAnalysisView';
import { ComparativeAnalysisView } from './views/ComparativeAnalysisView';

interface ChildDevelopmentAnalysisTabProps {
  studentData: ChildDevelopmentData;
  allAcademicRecords?: any[];
  allAttendanceRecords?: any[];
  allViolations?: any[];
  allQuizPoints?: any[];
}

export const ChildDevelopmentAnalysisTab: React.FC<ChildDevelopmentAnalysisTabProps> = (props) => {
  const [activeTabMode, setActiveTabMode] = useState<'single' | 'comparative'>('single');

  return (
    <div className="space-y-6">
      <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl w-max">
        <button
          onClick={() => setActiveTabMode('single')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTabMode === 'single'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Semester Tunggal
        </button>
        <button
          onClick={() => setActiveTabMode('comparative')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTabMode === 'comparative'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Komparatif Antar Semester
        </button>
      </div>

      {activeTabMode === 'single' ? (
        <SingleAnalysisView {...props} />
      ) : (
        <ComparativeAnalysisView {...props} />
      )}
    </div>
  );
};
