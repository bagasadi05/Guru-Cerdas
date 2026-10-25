export const SEMESTER_1_MONTH_NAMES = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const SEMESTER_2_MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

export function getMonthNames(semester: number): string[] {
  return semester === 2 ? SEMESTER_2_MONTH_NAMES : SEMESTER_1_MONTH_NAMES;
}

export const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
} as const;
