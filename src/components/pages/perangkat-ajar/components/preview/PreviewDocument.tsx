import React from 'react';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
  KaldikWeek,
  MatrixCell,
} from '../../../../../types/perangkatAjar';
import type { PreviewDocType, PreviewOrientation } from '../../hooks/usePreviewTabExport';
import { PreviewKopSurat } from './PreviewKopSurat';
import { PreviewProtaTable } from './PreviewProtaTable';
import { PreviewPromesTable } from './PreviewPromesTable';
import { PreviewSignaturesBlock } from './PreviewSignaturesBlock';

interface PreviewDocumentProps {
  printRef: React.RefObject<HTMLDivElement>;
  orientation: PreviewOrientation;
  identity: DocumentIdentity;
  selectedDoc: PreviewDocType;
  currentPromesSemester: 1 | 2;
  protaSem1Items: ProtaItem[];
  protaSem2Items: ProtaItem[];
  totalJpSem1: number;
  totalJpSem2: number;
  validation: ProtaValidationResult;
  currentPromesItems: ProtaItem[];
  monthNames: string[];
  kaldikWeeks: KaldikWeek[];
  activePromesCells: MatrixCell[];
  totalPromesTargetJp: number;
}

export const PreviewDocument: React.FC<PreviewDocumentProps> = ({
  printRef,
  orientation,
  identity,
  selectedDoc,
  currentPromesSemester,
  protaSem1Items,
  protaSem2Items,
  totalJpSem1,
  totalJpSem2,
  validation,
  currentPromesItems,
  monthNames,
  kaldikWeeks,
  activePromesCells,
  totalPromesTargetJp,
}) => {
  return (
    <div
      ref={printRef}
      id="printable-document"
      className={`bg-white text-slate-900 shadow-2xl transition-all duration-300 mx-auto rounded-sm border border-slate-300 dark:border-slate-800 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0 ${
        orientation === 'landscape'
          ? 'w-[297mm] min-h-[210mm] p-5 sm:p-6'
          : 'w-[210mm] min-h-[297mm] p-6 sm:p-8'
      }`}
      style={{
        width: orientation === 'landscape' ? '297mm' : '210mm',
        minHeight: orientation === 'landscape' ? '210mm' : '297mm',
        boxSizing: 'border-box',
      }}
    >
      <PreviewKopSurat
        identity={identity}
        selectedDoc={selectedDoc}
        currentPromesSemester={currentPromesSemester}
      />

      {selectedDoc === 'PROTA' ? (
        <PreviewProtaTable
          identity={identity}
          protaSem1Items={protaSem1Items}
          protaSem2Items={protaSem2Items}
          totalJpSem1={totalJpSem1}
          totalJpSem2={totalJpSem2}
          validation={validation}
        />
      ) : (
        <PreviewPromesTable
          identity={identity}
          currentPromesSemester={currentPromesSemester}
          currentPromesItems={currentPromesItems}
          monthNames={monthNames}
          kaldikWeeks={kaldikWeeks}
          activePromesCells={activePromesCells}
          totalPromesTargetJp={totalPromesTargetJp}
        />
      )}

      <PreviewSignaturesBlock identity={identity} />
    </div>
  );
};
