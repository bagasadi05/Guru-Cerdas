import type jsPDF from 'jspdf';

// Base64 encoded logos - these will be loaded from public folder
let logoSekolahBase64: string | null = null;
let logoKemenagBase64: string | null = null;

/**
 * Load and cache logos as base64 strings
 * This should be called once when the app starts or before PDF generation
 */
export async function loadLogos(): Promise<void> {
    if (logoSekolahBase64 && logoKemenagBase64) return;

    try {
        const [sekolahResponse, kemenagResponse] = await Promise.all([
            fetch('/logo_sekolah.png'),
            fetch('/logo_kemenag.png')
        ]);

        const [sekolahBlob, kemenagBlob] = await Promise.all([
            sekolahResponse.blob(),
            kemenagResponse.blob()
        ]);

        logoSekolahBase64 = await blobToBase64(sekolahBlob);
        logoKemenagBase64 = await blobToBase64(kemenagBlob);
    } catch (error) {
        console.error('Failed to load logos:', error);
    }
}

/**
 * Convert blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

interface PdfHeaderOptions {
    schoolName?: string;
    schoolAddress?: string;
    orientation?: 'portrait' | 'landscape';
    showSubtitle?: boolean;
}

/**
 * Add header with logos and school identity to PDF document
 * Layout: [Logo Sekolah] - [Identitas Sekolah] - [Logo Kemenag]
 * 
 * @param doc - jsPDF document instance
 * @param options - Header configuration options
 * @returns Y position after header (where content should start)
 */
export function addPdfHeader(
    doc: jsPDF,
    options: PdfHeaderOptions = {}
): number {
    const {
        schoolName = 'MI AL IRSYAD KOTA MADIUN',
        schoolAddress = 'Jl. Diponegoro No.112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
        orientation = 'portrait',
        showSubtitle = true
    } = options;

    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const margin = 14;
    const logoSize = 20;
    let y = 18;

    // Add logo sekolah (left) - perfectly aligned
    if (logoSekolahBase64) {
        try {
            doc.addImage(logoSekolahBase64, 'PNG', margin, y - 5, logoSize, logoSize);
        } catch (e) {
            console.warn('Failed to add school logo:', e);
        }
    }

    // Add logo kemenag (right) - perfectly aligned
    if (logoKemenagBase64) {
        try {
            doc.addImage(logoKemenagBase64, 'PNG', pageWidth - margin - logoSize, y - 5, logoSize, logoSize);
        } catch (e) {
            console.warn('Failed to add kemenag logo:', e);
        }
    }

    // Add school identity (center)
    const centerX = pageWidth / 2;

    // Ministry header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', centerX, y, { align: 'center' });
    y += 5;

    // School name - main title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), centerX, y, { align: 'center' });
    y += 6;

    // School address
    if (showSubtitle) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Split address if too long
        const maxWidth = pageWidth - (2 * margin) - 40; // Account for logos
        const addressLines = doc.splitTextToSize(schoolAddress, maxWidth);
        
        addressLines.forEach((line: string) => {
            doc.text(line, centerX, y, { align: 'center' });
            y += 3.5;
        });
        
        y += 1;
    }

    // Add double horizontal line (professional look)
    y += 2;
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    // Return Y position for content to start
    return y + 6;
}

/**
 * Add simple header without logos (fallback)
 */
export function addSimplePdfHeader(
    doc: jsPDF,
    schoolName: string = 'MI AL IRSYAD KOTA MADIUN',
    orientation: 'portrait' | 'landscape' = 'portrait'
): number {
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const margin = 15;
    let y = 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 6;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    return y + 8;
}

/**
 * Check if logos are loaded
 */
export function areLogosLoaded(): boolean {
    return !!(logoSekolahBase64 && logoKemenagBase64);
}

/**
 * Ensure logos are loaded before PDF generation
 * Call this helper before generating any PDF
 */
export async function ensureLogosLoaded(): Promise<boolean> {
    if (!areLogosLoaded()) {
        await loadLogos();
    }
    return areLogosLoaded();
}
