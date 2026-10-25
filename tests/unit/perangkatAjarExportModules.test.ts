import { describe, it, expect } from 'vitest';
import * as exportFacade from '../../src/utils/exportPerangkatAjar';
import * as exportModule from '../../src/utils/perangkatAjarExport';

describe('Perangkat Ajar Export Modular Architecture', () => {
    it('re-exports all export functions identically from facade', () => {
        expect(exportFacade.exportProtaToExcel).toBe(exportModule.exportProtaToExcel);
        expect(exportFacade.exportPromesToExcel).toBe(exportModule.exportPromesToExcel);
        expect(exportFacade.exportProtaToWord).toBe(exportModule.exportProtaToWord);
        expect(exportFacade.exportPromesToWord).toBe(exportModule.exportPromesToWord);
    });

    describe('Export Constants', () => {
        it('returns semester 1 months for semester 1', () => {
            const m = exportModule.getMonthNames(1);
            expect(m).toEqual(['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']);
        });

        it('returns semester 2 months for semester 2', () => {
            const m = exportModule.getMonthNames(2);
            expect(m).toEqual(['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
        });

        it('provides thin border configuration for ExcelJS', () => {
            expect(exportModule.THIN_BORDER.top.style).toBe('thin');
            expect(exportModule.THIN_BORDER.bottom.style).toBe('thin');
        });
    });
});
