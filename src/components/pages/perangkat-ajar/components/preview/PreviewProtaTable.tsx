import React from 'react';
import type { DocumentIdentity, ProtaItem, ProtaValidationResult } from '../../../../../types/perangkatAjar';

interface PreviewProtaTableProps {
  identity: DocumentIdentity;
  protaSem1Items: ProtaItem[];
  protaSem2Items: ProtaItem[];
  totalJpSem1: number;
  totalJpSem2: number;
  validation: ProtaValidationResult;
}

export const PreviewProtaTable: React.FC<PreviewProtaTableProps> = ({
  identity,
  protaSem1Items,
  protaSem2Items,
  totalJpSem1,
  totalJpSem2,
  validation,
}) => {
  return (
    <div className="overflow-x-auto mb-3">
      <table className="w-full border-collapse border border-slate-900 text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
            <th className="border border-slate-900 py-1 px-2 w-10 text-center">No</th>
            <th className="border border-slate-900 py-1 px-2 w-20 text-center">Semester</th>
            <th className="border border-slate-900 py-1 px-2.5 w-36">
              {identity.curriculum === 'K13' ? 'Kompetensi Inti' : 'Elemen / Domain'}
            </th>
            <th className="border border-slate-900 py-1 px-2.5">
              {identity.curriculum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Alur Tujuan Pembelajaran (ATP / TP)'}
            </th>
            <th className="border border-slate-900 py-1 px-2.5 w-44">Materi Pokok</th>
            <th className="border border-slate-900 py-1 px-2 w-20 text-center">Alokasi JP</th>
          </tr>
        </thead>
        <tbody>
          {/* Semester 1 Items */}
          {protaSem1Items.length > 0 && (
            <>
              <tr className="bg-slate-50/80 font-bold border-y border-slate-900">
                <td colSpan={6} className="border border-slate-900 py-0.5 px-2.5 text-slate-700">
                  SEMESTER 1 (GANJIL)
                </td>
              </tr>
              {protaSem1Items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-900">
                  <td className="border border-slate-900 py-1 px-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-900 py-1 px-2 text-center">Sem. 1</td>
                  <td className="border border-slate-900 py-1 px-2.5 font-medium">
                    {item.elementOrDomain || '-'}
                  </td>
                  <td className="border border-slate-900 py-1 px-2.5">
                    <span className="font-bold">{item.learningObjectiveCode}: </span>
                    {item.learningObjectiveText}
                  </td>
                  <td className="border border-slate-900 py-1 px-2.5">{item.coreTopic || '-'}</td>
                  <td className="border border-slate-900 py-1 px-2 text-center font-bold">
                    {item.targetJp} JP
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100/60 font-semibold border-b border-slate-900">
                <td colSpan={5} className="border border-slate-900 py-0.5 px-2.5 text-right">
                  Subtotal Semester 1
                </td>
                <td className="border border-slate-900 py-0.5 px-2 text-center font-bold">
                  {totalJpSem1} JP
                </td>
              </tr>
            </>
          )}

          {/* Semester 2 Items */}
          {protaSem2Items.length > 0 && (
            <>
              <tr className="bg-slate-50/80 font-bold border-y border-slate-900">
                <td colSpan={6} className="border border-slate-900 py-0.5 px-2.5 text-slate-700">
                  SEMESTER 2 (GENAP)
                </td>
              </tr>
              {protaSem2Items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-900">
                  <td className="border border-slate-900 py-1 px-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-900 py-1 px-2 text-center">Sem. 2</td>
                  <td className="border border-slate-900 py-1 px-2.5 font-medium">
                    {item.elementOrDomain || '-'}
                  </td>
                  <td className="border border-slate-900 py-1 px-2.5">
                    <span className="font-bold">{item.learningObjectiveCode}: </span>
                    {item.learningObjectiveText}
                  </td>
                  <td className="border border-slate-900 py-1 px-2.5">{item.coreTopic || '-'}</td>
                  <td className="border border-slate-900 py-1 px-2 text-center font-bold">
                    {item.targetJp} JP
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100/60 font-semibold border-b border-slate-900">
                <td colSpan={5} className="border border-slate-900 py-0.5 px-2.5 text-right">
                  Subtotal Semester 2
                </td>
                <td className="border border-slate-900 py-0.5 px-2 text-center font-bold">
                  {totalJpSem2} JP
                </td>
              </tr>
            </>
          )}

          {/* Grand Total Row */}
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
            <td colSpan={5} className="border border-slate-900 py-1 px-2.5 text-right">
              TOTAL ALOKASI WAKTU TAHUNAN
            </td>
            <td className="border border-slate-900 py-1 px-2 text-center font-bold">
              {validation.allocatedAnnualJp} JP
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
