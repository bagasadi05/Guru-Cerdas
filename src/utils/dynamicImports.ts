/**
 * Dynamic Import Utilities for Heavy Libraries
 * 
 * These utilities lazy-load heavy libraries (xlsx, jspdf, html2canvas)
 * to reduce initial bundle size. Libraries are cached after first load.
 */

// Type definitions for lazy-loaded modules
type XLSXShimModule = typeof import('./xlsxShim');
type ExcelJSModule = typeof import('exceljs');
type JsPDFModule = typeof import('jspdf');
type AutoTableModule = typeof import('jspdf-autotable');
type Html2CanvasModule = typeof import('html2canvas');

// Cached module references
let xlsxModule: XLSXShimModule | null = null;
let exceljsModule: ExcelJSModule | null = null;
let jspdfModule: JsPDFModule | null = null;
let autoTableModule: AutoTableModule | null = null;
let html2canvasModule: Html2CanvasModule | null = null;

/**
 * Dynamically imports the XLSX compatibility shim for Excel operations.
 * The module is cached after the first load.
 * 
 * @example
 * const XLSX = await getXLSX();
 * const workbook = XLSX.utils.book_new();
 */
export async function getXLSX(): Promise<XLSXShimModule> {
    if (!xlsxModule) {
        xlsxModule = await import('./xlsxShim');
    }
    return xlsxModule;
}

/**
 * Dynamically imports the ExcelJS library for Excel template operations.
 * The module is cached after the first load.
 */
export async function getExcelJS(): Promise<ExcelJSModule> {
    if (!exceljsModule) {
        exceljsModule = await import('exceljs');
    }
    return exceljsModule;
}

/**
 * Dynamically imports jsPDF for PDF generation.
 * The module is cached after the first load.
 * 
 * @example
 * const { default: jsPDF } = await getJsPDF();
 * const doc = new jsPDF();
 */
export async function getJsPDF(): Promise<JsPDFModule> {
    if (!jspdfModule) {
        jspdfModule = await import('jspdf');
    }
    return jspdfModule;
}

/**
 * Dynamically imports jspdf-autotable for table generation in PDFs.
 * The module is cached after the first load.
 * 
 * @example
 * const autoTable = await getAutoTable();
 * autoTable(doc, { ... });
 */
export async function getAutoTable(): Promise<AutoTableModule> {
    if (!autoTableModule) {
        autoTableModule = await import('jspdf-autotable');
    }
    return autoTableModule;
}

/**
 * Dynamically imports html2canvas for screenshot functionality.
 * The module is cached after the first load.
 * 
 * @example
 * const html2canvas = await getHtml2Canvas();
 * const canvas = await html2canvas.default(element);
 */
export async function getHtml2Canvas(): Promise<Html2CanvasModule> {
    if (!html2canvasModule) {
        html2canvasModule = await import('html2canvas');
    }
    return html2canvasModule;
}

/**
 * Preloads all export-related libraries.
 * Call this when user hovers over export button for faster perceived performance.
 */
export async function preloadExportLibraries(): Promise<void> {
    await Promise.all([
        getXLSX(),
        getJsPDF(),
        getAutoTable(),
    ]);
}

/**
 * Clears the module cache (useful for testing).
 */
export function clearModuleCache(): void {
    xlsxModule = null;
    jspdfModule = null;
    autoTableModule = null;
    html2canvasModule = null;
}
