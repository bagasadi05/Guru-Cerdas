import type jsPDF from 'jspdf';

// Base64 encoded logos - these will be loaded from public folder
interface CachedLogo {
    dataUrl: string;
    width: number;
    height: number;
}

let logoSekolah: CachedLogo | null = null;
let logoKemenag: CachedLogo | null = null;

/**
 * Load and cache logos as base64 strings
 * This should be called once when the app starts or before PDF generation
 */
export async function loadLogos(): Promise<void> {
    if (logoSekolah && logoKemenag) return;

    try {
        const [sekolahResponse, kemenagResponse] = await Promise.all([
            fetch('/logo_sekolah.png'),
            fetch('/logo_kemenag.png')
        ]);

        const [sekolahBlob, kemenagBlob] = await Promise.all([
            sekolahResponse.blob(),
            kemenagResponse.blob()
        ]);

        const [sekolahLogo, kemenagLogo] = await Promise.all([
            blobToCachedLogo(sekolahBlob),
            blobToCachedLogo(kemenagBlob)
        ]);

        logoSekolah = sekolahLogo;
        logoKemenag = kemenagLogo;
    } catch (error) {
        console.error('Failed to load logos:', error);
    }
}

/**
 * Convert blob to base64 string and collect intrinsic image dimensions
 */
async function blobToCachedLogo(blob: Blob): Promise<CachedLogo> {
    const [dataUrl, dimensions] = await Promise.all([
        blobToBase64(blob),
        getImageDimensions(blob)
    ]);

    return {
        dataUrl,
        width: dimensions.width,
        height: dimensions.height
    };
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const imageUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
            URL.revokeObjectURL(imageUrl);
        };

        image.onerror = (error) => {
            URL.revokeObjectURL(imageUrl);
            reject(error);
        };

        image.src = imageUrl;
    });
}

function addContainedLogo(
    doc: jsPDF,
    logo: CachedLogo,
    format: 'PNG' | 'JPEG',
    bounds: { x: number; y: number; width: number; height: number }
) {
    const scale = Math.min(bounds.width / logo.width, bounds.height / logo.height);
    const renderWidth = logo.width * scale;
    const renderHeight = logo.height * scale;
    const renderX = bounds.x + (bounds.width - renderWidth) / 2;
    const renderY = bounds.y + (bounds.height - renderHeight) / 2;

    doc.addImage(logo.dataUrl, format, renderX, renderY, renderWidth, renderHeight);
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
    let y = 18;
    const schoolLogoBounds = { x: margin - 1, y: y - 8, width: 36, height: 30 };
    const kemenagLogoBounds = { x: pageWidth - margin - 24, y: y - 6, width: 24, height: 24 };

    // Add logo sekolah (left) - larger box to match visual weight with Kemenag logo
    if (logoSekolah) {
        try {
            addContainedLogo(doc, logoSekolah, 'PNG', schoolLogoBounds);
        } catch (e) {
            console.warn('Failed to add school logo:', e);
        }
    }

    // Add logo kemenag (right)
    if (logoKemenag) {
        try {
            addContainedLogo(doc, logoKemenag, 'PNG', kemenagLogoBounds);
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
        const maxWidth = pageWidth - (2 * margin) - 64; // Account for larger logo boxes
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
    return !!(logoSekolah && logoKemenag);
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
