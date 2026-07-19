import type jsPDF from 'jspdf';

// Helper function to sanitize text for jsPDF rendering (stripping emojis/unicode >= 256 except bullet U+2022)
export const cleanTextForPDF = (text: string | null | undefined): string => {
  if (!text) return '';
  const cleaned = text
    .replace(/[\u201c\u201d\u201e\u201f\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201a\u201b\u2032\u2035]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2022/g, '•')
    .replace(/\u2026/g, '...');
  let result = '';
  for (let i = 0; i < cleaned.length; i++) {
    const charCode = cleaned.charCodeAt(i);
    if (charCode < 256 || charCode === 0x2022) {
      result += cleaned[i];
    }
  }
  return result.split('\n').map(line => line.trim()).join('\n');
};

// Helper function to abbreviate long Indonesian subject names for PDF charts
export const abbreviateSubject = (subject: string): string => {
  const s = subject.toLowerCase().trim();
  if (s.includes('pancasila') || s.includes('kewarganegaraan') || s === 'ppkn') return 'PPKn';
  if (s.includes('jasmani') || s.includes('olahraga') || s === 'pjok') return 'PJOK';
  if (s.includes('bahasa indonesia')) return 'B. Indo';
  if (s.includes('bahasa inggris')) return 'B. Ingg';
  if (s.includes('bahasa arab')) return 'B. Arab';
  if (s.includes('al-qur')) return 'Al-Qur\'an';
  if (s.includes('akidah') || s.includes('aqidah')) return 'Akidah';
  if (s.includes('fiqih') || s.includes('fiqh')) return 'Fiqih';
  if (s.includes('sejarah kebudayaan islam') || s.includes('ski')) return 'SKI';
  if (s.includes('matematika')) return 'MTK';
  if (s.includes('ilmu pengetahuan alam') || s.includes('ipa')) return 'IPA';
  if (s.includes('ilmu pengetahuan sosial') || s === 'ips') return 'IPS';
  if (s.includes('seni budaya') || s.includes('sbdp')) return 'SBdP';
  if (subject.length > 12) {
    return subject.substring(0, 10) + '..';
  }
  return subject;
};

// Helper function to draw a clean vector radar chart directly in jsPDF
export const drawRadarChartInPDF = (
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  labels: string[],
  datasets: { values: number[]; strokeColor: [number, number, number]; label: string }[]
) => {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2 - 15;
  const numPoints = labels.length;
  const maxScore = 100;

  // Draw concentric background polygons
  const levels = [20, 40, 60, 80, 100];
  doc.setLineWidth(0.1);
  doc.setDrawColor(203, 213, 225); // Slate 300
  levels.forEach(level => {
    const pts: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / numPoints;
      const r = radius * (level / maxScore);
      pts.push([centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)]);
    }
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      doc.line(p1[0], p1[1], p2[0], p2[1]);
    }
  });

  // Draw axes & labels
  for (let i = 0; i < numPoints; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / numPoints;
    const ax = centerX + radius * Math.cos(angle);
    const ay = centerY + radius * Math.sin(angle);
    doc.line(centerX, centerY, ax, ay);

    // Label positioning
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    const labelDistance = radius + 4;
    const lx = centerX + labelDistance * Math.cos(angle);
    const ly = centerY + labelDistance * Math.sin(angle);
    
    let align: 'center' | 'left' | 'right' = 'center';
    const cosVal = Math.cos(angle);
    if (cosVal > 0.1) align = 'left';
    else if (cosVal < -0.1) align = 'right';
    doc.text(labels[i], lx, ly + 1.5, { align });
  }

  // Draw datasets
  datasets.forEach(dataset => {
    const pts: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      const val = dataset.values[i] ?? 0;
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / numPoints;
      const r = radius * (val / maxScore);
      pts.push([centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)]);
    }

    // Draw polygon outline
    doc.setLineWidth(0.8);
    doc.setDrawColor(dataset.strokeColor[0], dataset.strokeColor[1], dataset.strokeColor[2]);
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      doc.line(p1[0], p1[1], p2[0], p2[1]);
    }

    // Draw small circles at data vertices
    doc.setFillColor(dataset.strokeColor[0], dataset.strokeColor[1], dataset.strokeColor[2]);
    pts.forEach(p => {
      doc.circle(p[0], p[1], 1.0, 'FD');
    });
  });

  // Draw Legend
  const legendY = centerY + radius + 11;
  doc.setFontSize(8);
  datasets.forEach((dataset, idx) => {
    // Centering calculations
    const totalWidth = datasets.length * 40;
    const startX = centerX - totalWidth / 2 + 5;
    const lx = startX + idx * 40;
    
    doc.setFillColor(dataset.strokeColor[0], dataset.strokeColor[1], dataset.strokeColor[2]);
    doc.rect(lx, legendY - 2, 4, 2, 'F');
    
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(dataset.label, lx + 6, legendY);
  });
};
