/**
 * @fileoverview Grade Audit Widget
 *
 * Displays a filterable grade-completion audit: class, subject, and
 * assessment selectors with a progress bar and a CTA to bulk-input
 * missing grades.
 *
 * @module components/dashboard/GradeAuditWidget
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMinusIcon, ClipboardPenIcon, CheckCircleIcon, BookOpenIcon } from '../Icons';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useGradeAudit } from '../../hooks/useGradeAudit';
import { useI18n } from '../../utils/i18n';
import type { DashboardQueryData } from '../../types';

interface GradeAuditWidgetProps {
  data: DashboardQueryData | undefined;
  classes: DashboardQueryData['classes'];
}

const GradeAuditWidget: React.FC<GradeAuditWidgetProps> = ({ data, classes }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const {
    uniqueSubjects,
    subjectForCompletionCheck,
    setSubjectForCompletionCheck,
    assessmentForCompletionCheck,
    setAssessmentForCompletionCheck,
    selectedClassForCheck,
    setSelectedClassForCheck,
    uniqueAssessmentsForSubject,
    studentsMissingGrade,
    completionPercentage,
  } = useGradeAudit({ data });

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubjectForCompletionCheck(e.target.value);
    setAssessmentForCompletionCheck('');
  };

  const handleOpenMassInput = () => {
    if (!subjectForCompletionCheck) return;

    let classIdToPass: string | null = selectedClassForCheck || null;
    if (!classIdToPass && studentsMissingGrade.length > 0) {
      classIdToPass = studentsMissingGrade[0].class_id;
    }

    let assessmentToPass = assessmentForCompletionCheck;
    if (
      !assessmentToPass &&
      studentsMissingGrade.length > 0 &&
      'missingAssessments' in studentsMissingGrade[0]
    ) {
      const missingStudent = studentsMissingGrade[0] as { missingAssessments: string[] };
      assessmentToPass = missingStudent.missingAssessments[0] ?? '';
    }

    navigate('/input-massal', {
      state: {
        prefill: {
          mode: 'subject_grade',
          classId: classIdToPass,
          subject: subjectForCompletionCheck,
          assessment_name: assessmentToPass,
        },
      },
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-0 overflow-hidden flex flex-col border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
      <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-amber-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.dashboard.gradeAuditTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.dashboard.gradeAuditSubtitle}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
            <UserMinusIcon className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="space-y-4 mb-4">
          <Select value={selectedClassForCheck} onChange={(e) => setSelectedClassForCheck(e.target.value)}>
            <option value="">{t.dashboard.allClasses}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Select
              value={subjectForCompletionCheck}
              onChange={handleSubjectChange}
              className="flex-1"
            >
              <option value="" disabled>
                {t.dashboard.subject}
              </option>
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </Select>
            <Select
              value={assessmentForCompletionCheck}
              onChange={(e) => setAssessmentForCompletionCheck(e.target.value)}
              className="flex-1"
              disabled={uniqueAssessmentsForSubject.length === 0}
            >
              <option value="">{t.common.all}</option>
              {uniqueAssessmentsForSubject.map((assessment) => (
                <option key={assessment} value={assessment}>
                  {assessment}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {subjectForCompletionCheck ? (
          <div className="flex-1">
            <div className="mb-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                <span>{t.dashboard.completionProgress}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {completionPercentage}%
                </span>
                <span className="text-xxs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-200/20 shadow-sm">
                  {t.dashboard.gradedComplete}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-emerald-600"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            {studentsMissingGrade.length > 0 ? (
              <div className="mt-auto">
                <Button onClick={handleOpenMassInput} variant="primary" className="w-full" size="sm">
                  <ClipboardPenIcon className="w-4 h-4 mr-2" />
                  {t.dashboard.completeMissing} ({studentsMissingGrade.length})
                </Button>
              </div>
            ) : (
              <div className="mt-auto flex flex-col items-center justify-center py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-2">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{t.dashboard.allGraded}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {t.dashboard.allGradedDesc}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <BookOpenIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.dashboard.selectSubject}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t.dashboard.selectSubjectDesc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeAuditWidget;
