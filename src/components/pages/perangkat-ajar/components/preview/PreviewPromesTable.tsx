import React from 'react';
import type {
  DocumentIdentity,
  ProtaItem,
  KaldikWeek,
  MatrixCell,
} from '../../../../../types/perangkatAjar';

interface PreviewPromesTableProps {
  identity: DocumentIdentity;
  currentPromesSemester: 1 | 2;
  currentPromesItems: ProtaItem[];
  monthNames: string[];
  kaldikWeeks: KaldikWeek[];
  activePromesCells: MatrixCell[];
  totalPromesTargetJp: number;
}

export const PreviewPromesTable: React.FC<PreviewPromesTableProps> = ({
  identity,
  currentPromesSemester,
  currentPromesItems,
  monthNames,
  kaldikWeeks,
  activePromesCells,
  totalPromesTargetJp,
}) => {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse border border-slate-900 text-[10px]">
        <thead>
          {/* Tier 1 Header */}
          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
            <th rowSpan={2} className="border border-slate-900 py-1.5 px-1 w-7 text-center">
              No
            </th>
            <th rowSpan={2} className="border border-slate-900 py-1.5 px-2 w-24">
              {identity.curriculum === 'K13' ? 'KI / KD' : 'Elemen'}
            </th>
            <th rowSpan={2} className="border border-slate-900 py-1.5 px-2">
              Tujuan Pembelajaran (TP)
            </th>
            <th rowSpan={2} className="border border-slate-900 py-1.5 px-2 w-28">
              Materi Pokok
            </th>
            <th rowSpan={2} className="border border-slate-900 py-1.5 px-1 w-10 text-center">
              JP
            </th>

            {/* 6 Month Group Headers (5 Weeks each) */}
            {monthNames.map((monthName, mIdx) => (
              <th
                key={mIdx}
                colSpan={5}
                className="border border-slate-900 py-1 px-1 text-center font-bold uppercase tracking-wider bg-slate-100 text-slate-900 text-[10px]"
              >
                {monthName}
              </th>
            ))}
          </tr>

          {/* Tier 2 Header: Weeks 1-5 per Month */}
          <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-900">
            {monthNames.map((_, mIdx) =>
              [1, 2, 3, 4, 5].map((w) => {
                const kaldikMonth = currentPromesSemester === 1 ? mIdx + 7 : mIdx + 1;
                const matchedWeek = kaldikWeeks.find(
                  (kw) => kw.month === kaldikMonth && kw.weekNumber === w
                );
                const isLocked = matchedWeek && matchedWeek.type !== 'KBM';

                return (
                  <th
                    key={`${mIdx}-${w}`}
                    className={`border border-slate-900 py-0.5 px-0.5 w-[18px] text-center font-mono text-[9px] ${
                      isLocked ? 'bg-slate-200 text-slate-500' : 'bg-slate-50 text-slate-800'
                    }`}
                    title={isLocked && matchedWeek ? `Pekan Non-Efektif: ${matchedWeek.type}` : `Pekan ${w}`}
                  >
                    {w}
                  </th>
                );
              })
            )}
          </tr>
        </thead>

        <tbody>
          {currentPromesItems.length === 0 ? (
            <tr>
              <td colSpan={35} className="border border-slate-900 py-8 text-center text-slate-400 italic">
                Belum ada Tujuan Pembelajaran untuk semester ini. Silakan tambahkan materi di tab Program Tahunan (Prota).
              </td>
            </tr>
          ) : (
            currentPromesItems.map((item, idx) => (
              <tr key={item.id} className="border-b border-slate-900">
                <td className="border border-slate-900 py-1 px-1 text-center text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-900 py-1 px-2 font-medium">
                  {item.elementOrDomain || '-'}
                </td>
                <td className="border border-slate-900 py-1 px-2">
                  <span className="font-bold">{item.learningObjectiveCode}: </span>
                  {item.learningObjectiveText}
                </td>
                <td className="border border-slate-900 py-1 px-2">{item.coreTopic || '-'}</td>
                <td className="border border-slate-900 py-1 px-1 text-center font-bold">
                  {item.targetJp}
                </td>

                {/* 30 Week Allocation Cells */}
                {monthNames.map((_, mIdx) =>
                  [1, 2, 3, 4, 5].map((w) => {
                    const kaldikMonth = currentPromesSemester === 1 ? mIdx + 7 : mIdx + 1;
                    const matchedWeek = kaldikWeeks.find(
                      (kw) => kw.month === kaldikMonth && kw.weekNumber === w
                    );
                    const cell = activePromesCells.find(
                      (c) => c.rowId === item.id && c.monthIndex === mIdx && c.weekNumber === w
                    );
                    const isLocked = cell?.isLocked || (matchedWeek && matchedWeek.type !== 'KBM');

                    if (isLocked) {
                      return (
                        <td
                          key={`${mIdx}-${w}`}
                          className="border border-slate-900 py-0.5 px-0.5 text-center bg-slate-200 text-slate-400"
                          title={`Pekan Non-Efektif (${matchedWeek?.type || 'Non-KBM'})`}
                        >
                          {/* Shaded cell for locked week */}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${mIdx}-${w}`}
                        className="border border-slate-900 py-0.5 px-0.5 text-center font-mono text-[9px]"
                      >
                        {cell && cell.allocatedJp > 0 ? (
                          <span className="font-bold text-slate-900">{cell.allocatedJp}</span>
                        ) : (
                          <span className="text-slate-200">·</span>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))
          )}

          {/* Total Weekly Sums Row */}
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
            <td colSpan={4} className="border border-slate-900 py-1 px-2 text-right">
              JUMLAH ALOKASI JP MINGGUAN
            </td>
            <td className="border border-slate-900 py-1 px-1 text-center font-bold">
              {totalPromesTargetJp}
            </td>

            {/* 30 Column Sums */}
            {monthNames.map((_, mIdx) =>
              [1, 2, 3, 4, 5].map((w) => {
                const kaldikMonth = currentPromesSemester === 1 ? mIdx + 7 : mIdx + 1;
                const matchedWeek = kaldikWeeks.find(
                  (kw) => kw.month === kaldikMonth && kw.weekNumber === w
                );
                const isLocked = matchedWeek && matchedWeek.type !== 'KBM';

                const colSum = activePromesCells
                  .filter((c) => c.monthIndex === mIdx && c.weekNumber === w)
                  .reduce((sum, c) => sum + (c.allocatedJp || 0), 0);

                return (
                  <td
                    key={`sum-${mIdx}-${w}`}
                    className={`border border-slate-900 py-0.5 px-0.5 text-center font-mono text-[9px] ${
                      isLocked ? 'bg-slate-200' : ''
                    }`}
                  >
                    {!isLocked && colSum > 0 ? <span className="font-bold">{colSum}</span> : ''}
                  </td>
                );
              })
            )}
          </tr>
        </tbody>
      </table>

      {/* Shaded legend footnote */}
      <p className="text-[10px] text-slate-600 italic mt-1.5">
        * Keterangan: Kolom berlatar belakang abu-abu adalah pekan non-efektif (libur semester, jeda tengah semester, asesmen, atau peringatan hari besar) sesuai Kalender Pendidikan.
      </p>
    </div>
  );
};
