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
    
    // Colors to match report card style
    const PRIMARY_DARK = [7, 54, 66] as const;
    const BORDER = [203, 213, 225] as const;
    const MUTED = [71, 85, 105] as const;

    // Draw background and border
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 46, 'F');

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    // Draw rounded rectangle for the header
    doc.roundedRect(margin - 3, 8, pageWidth - ((margin - 3) * 2), 28, 2, 2, 'S');

    const schoolLogoSize = 22;
    const kemenagLogoWidth = 18;
    const kemenagLogoHeight = 18 * (323 / 360);

    const schoolLogoBounds = { x: margin - 1, y: 10, width: schoolLogoSize, height: schoolLogoSize };
    const kemenagLogoBounds = { x: pageWidth - margin - kemenagLogoWidth, y: 11 + ((18 - kemenagLogoHeight) / 2), width: kemenagLogoWidth, height: kemenagLogoHeight };

    // Add logo sekolah (left)
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

    doc.setTextColor(...PRIMARY_DARK);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', centerX, 14, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('MADRASAH IBTIDAIYAH', centerX, 18.5, { align: 'center' });

    doc.setTextColor(...PRIMARY_DARK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), centerX, 24.5, { align: 'center' });

    if (showSubtitle) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(schoolAddress, centerX, 30.5, { align: 'center' });
    }

    // Reset colors for subsequent content
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    // Return Y position for content to start
    return 46;
}

export interface OfficialKopOptions {
    ministryName?: string;
    regionalOffice?: string;
    schoolName?: string;
    schoolAddress?: string;
    schoolContact?: string;
    orientation?: 'portrait' | 'landscape';
    margin?: number;
    showLogos?: boolean;
}

/**
 * Add official Madrasah Kop Surat (Standard Kemenag Format with Double Rule)
 * Compact and authentic official header for Prota, Promes, SK, etc.
 * Height is ~22mm, leaving maximal vertical space for single-page documents.
 * 
 * @param doc - jsPDF instance
 * @param options - Official Kop options
 * @returns Y position after header double-line where body content should start
 */
export function addOfficialMadrasahKop(
    doc: jsPDF,
    options: OfficialKopOptions = {}
): number {
    const {
        ministryName = 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
        regionalOffice = 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
        schoolName = 'MADRASAH IBTIDAIYAH AL IRSYAD KOTA MADIUN',
        schoolAddress = 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
        schoolContact = 'Telp: (0351) 463765 | Email: mialirsyadkotamadiun@gmail.com | Website: mialirsyadkotamadiun.sch.id',
        orientation = 'landscape',
        margin = 10,
        showLogos = true,
    } = options;

    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const startY = 6;
    const logoHeight = 16;
    const logoSchoolWidth = 16;
    const logoKemenagWidth = 15;
    const logoKemenagHeight = 15 * (323 / 360);

    // Left Logo (Madrasah)
    if (showLogos && logoSekolah) {
        try {
            addContainedLogo(doc, logoSekolah, 'PNG', {
                x: margin,
                y: startY,
                width: logoSchoolWidth,
                height: logoHeight,
            });
        } catch (e) {
            console.warn('Failed to add school logo:', e);
        }
    }

    // Right Logo (Kemenag)
    if (showLogos && logoKemenag) {
        try {
            addContainedLogo(doc, logoKemenag, 'PNG', {
                x: pageWidth - margin - logoKemenagWidth,
                y: startY + (logoHeight - logoKemenagHeight) / 2,
                width: logoKemenagWidth,
                height: logoKemenagHeight,
            });
        } catch (e) {
            console.warn('Failed to add kemenag logo:', e);
        }
    }

    // Center Official Text
    const centerX = pageWidth / 2;
    doc.setTextColor(15, 23, 42);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(ministryName.toUpperCase(), centerX, startY + 3.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(regionalOffice.toUpperCase(), centerX, startY + 7.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(schoolName.toUpperCase(), centerX, startY + 11.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(schoolAddress, centerX, startY + 15, { align: 'center' });

    if (schoolContact) {
        doc.setFontSize(6.5);
        doc.text(schoolContact, centerX, startY + 18, { align: 'center' });
    }

    // Official Double Line (Garis Ganda Kop Surat)
    const lineY = startY + 20;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6); // Top thick line
    doc.line(margin, lineY, pageWidth - margin, lineY);

    doc.setLineWidth(0.2); // Bottom thin line
    doc.line(margin, lineY + 0.8, pageWidth - margin, lineY + 0.8);

    // Reset styles
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    return lineY + 0.8; // Exactly at the bottom edge of the double line (~26.8 mm)
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
