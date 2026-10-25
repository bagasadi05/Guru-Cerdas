import { normalizeSoalEvaluasi } from '../../../../../services/modulAjarAiGenerator';
import { expandInlineLkpdLines, expandInlineOptions, LKPD_LABELS } from './lkpdFormatting';
import type { FormState } from '../../types';

export const sanitize = (text: unknown): string => {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  return (text as string)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\*\*/g, '')
    .replace(/❖/g, '-')
    .trim();
};

export const listToHtml = (list: unknown): string => {
  if (!list) return '<li>-</li>';
  if (typeof list === 'string') {
    const arr = list.split('\n').filter((item) => item.trim() !== '');
    return arr.length > 0
      ? arr.map((item) => `<li>${sanitize(item.replace(/^[-*•]\s*/, ''))}</li>`).join('')
      : `<li>${sanitize(list)}</li>`;
  }
  if (!Array.isArray(list)) return `<li>${sanitize(String(list))}</li>`;
  if (list.length === 0) return '<li>-</li>';
  return list
    .map((item) =>
      `<li>${sanitize(typeof item === 'string' ? item.replace(/^[-*•]\s*/, '') : String(item))}</li>`,
    )
    .join('');
};

export const listToNumberedHtml = (list: unknown): string => {
  if (!list) return '<li>-</li>';
  if (typeof list === 'string') {
    const arr = list.split('\n').filter((item) => item.trim() !== '');
    return arr.length > 0
      ? arr.map((item) => `<li>${sanitize(item.replace(/^\d+\.\s*/, ''))}</li>`).join('')
      : `<li>${sanitize(list)}</li>`;
  }
  if (!Array.isArray(list)) return `<li>${sanitize(String(list))}</li>`;
  if (list.length === 0) return '<li>-</li>';
  return list
    .map((item) =>
      `<li>${sanitize(typeof item === 'string' ? item.replace(/^\d+\.\s*/, '') : String(item))}</li>`,
    )
    .join('');
};

export const formatStepList = (items: unknown): string => {
  if (!items) return '<div>-</div>';
  let rawList: string[] = [];
  if (typeof items === 'string') {
    rawList = items.split('\n').filter((l) => l.trim() !== '');
  } else if (Array.isArray(items)) {
    rawList = items.map((it) => String(it).trim()).filter(Boolean);
  } else {
    rawList = [String(items)];
  }
  if (rawList.length === 0) return '<div>-</div>';

  return `
    <ul style="margin: 4px 0; padding-left: 20px; line-height: 1.55; text-align: justify; list-style-type: disc;">
      ${rawList
        .map((item) => {
          const colonIdx = item.indexOf(': ');
          if (colonIdx !== -1 && colonIdx < 65) {
            const title = item.substring(0, colonIdx);
            const desc = item.substring(colonIdx + 2);
            return `<li style="margin-bottom: 6px;"><strong>${sanitize(title)}:</strong> ${sanitize(desc)}</li>`;
          }
          return `<li style="margin-bottom: 6px;">${sanitize(item.replace(/^[-*•]\s*/, ''))}</li>`;
        })
        .join('')}
    </ul>
  `;
};

export const formatActivityText = (text: string): string => {
  if (!text) return '-';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) {
    return sanitize(text);
  }
  return `<ul style="margin: 2px 0; padding-left: 18px; line-height: 1.45; text-align: left; list-style-type: disc;">${lines.map((line) => `<li style="margin-bottom: 4px;">${sanitize(line.replace(/^[-*•]\s*/, ''))}</li>`).join('')}</ul>`;
};

export const intiToHtml = (steps: unknown): string => {
  if (!steps) return '<div>-</div>';
  if (typeof steps === 'string') {
    return `<div style="line-height: 1.5; text-align: justify;">${sanitize(steps)}</div>`;
  }
  if (!Array.isArray(steps) || steps.length === 0) return '<div>-</div>';

  return (steps as Record<string, any>[])
    .map((s, idx) => {
      const faseRaw = s.fase || s.nama_fase || s.name || '';
      const cleanedFase = faseRaw.replace(/^langkah\s*\d+\s*:\s*/i, '').trim();

      let title = cleanedFase || `Tahap Pembelajaran ${idx + 1}`;
      let descriptionHtml = '';

      const dotIndex = cleanedFase.indexOf('. ');
      if (dotIndex !== -1 && dotIndex < 40) {
        title = cleanedFase.substring(0, dotIndex);
        const description = cleanedFase.substring(dotIndex + 2).trim();
        if (description) {
          descriptionHtml = `<div style="margin: 2px 0 6px 0; font-size: 9.5pt; color: #555555; font-style: italic; line-height: 1.35;">${sanitize(description)}</div>`;
        }
      }

      const displayTitle = `${s.pertemuan ? `Pertemuan ${s.pertemuan} - ` : ''}Langkah ${idx + 1}: ${sanitize(title)}${s.alokasiWaktu ? ` (${sanitize(s.alokasiWaktu)})` : ''}`;
      const guruContent = s.kegiatanGuru || s.guru || s.teacherActivity || s.kegiatan_guru || '';
      const siswaContent = s.kegiatanSiswa || s.siswa || s.studentActivity || s.kegiatan_siswa || '';

      return `
        <div style="margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;"><table style="width: 100%; border-collapse: collapse; border: 1px solid #cfd8dc; font-size: 10pt; font-family: 'Times New Roman'; table-layout: fixed; page-break-inside: avoid; break-inside: avoid;"><thead><tr style="background-color: #e8f5e9; page-break-inside: avoid; break-inside: avoid;"><th colspan="2" style="border: 1px solid #cfd8dc; border-left: 4px solid #0d6b3e; padding: 6px 10px; background-color: #e8f5e9; text-align: left;">
          <div style="font-weight: bold; color: #0d6b3e; font-size: 10.5pt;">
            ${displayTitle}
          </div>
          ${descriptionHtml}
          </th></tr></thead>
            <tr style="border: none;">
              <td style="width: 50%; vertical-align: top; padding: 8px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
                <div style="font-weight: bold; color: #1b5e20; margin-bottom: 4px; border-bottom: 1px solid #c8e6c9; padding-bottom: 2px;">
                  Kegiatan Guru:
                </div>
                <div style="text-align: justify; line-height: 1.45; color: #212121;">
                  ${formatActivityText(guruContent)}
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding: 8px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
                <div style="font-weight: bold; color: #0d47a1; margin-bottom: 4px; border-bottom: 1px solid #bbdefb; padding-bottom: 2px;">
                  Kegiatan Peserta Didik:
                </div>
                <div style="text-align: justify; line-height: 1.45; color: #212121;">
                  ${formatActivityText(siswaContent)}
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join('');
};

export const formatLkpdContent = (text: string): string => {
  if (!text) return '<p>-</p>';
  const lines = expandInlineLkpdLines(text);
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
    if (inOl) {
      html += '</ol>';
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeLists();
      continue;
    }

    const labelMatch = line.match(new RegExp(`^(${LKPD_LABELS})\\s*:\\s*(.+)$`, 'i'));
    if (labelMatch) {
      closeLists();
      html += `<p style="margin: 4px 0 6px 0; line-height: 1.55; text-align: left;"><strong>${sanitize(labelMatch[1])}:</strong> ${sanitize(labelMatch[2])}</p>`;
    } else if (
      /^#{1,4}\s+/.test(line) ||
      /^(bagian\s*\d+|aktivitas\s*\d+|tahap\s*\d+|petunjuk\s*khusus|alat\s*dan\s*bahan|langkah\s*kerja)\s*:/i.test(
        line,
      )
    ) {
      closeLists();
      const headingText = line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '');
      html += `<div style="font-weight: bold; font-size: 11pt; color: #0d6b3e; margin: 12px 0 6px 0; border-bottom: 1px dashed #0d6b3e; padding-bottom: 3px;">${sanitize(headingText)}</div>`;
    } else if (/^\[(.*?)\]$/.test(line) || /^\[kotak/i.test(line)) {
      closeLists();
      const boxLabel = line.replace(/^\[|\]$/g, '').trim();
      html += `
        <div style="border: 1.5px dashed #666666; background-color: #fafafa; border-radius: 6px; padding: 16px; margin: 10px 0; text-align: center; color: #555555; font-style: italic; min-height: 60px;">
          ${sanitize(boxLabel || 'Tempat Menuliskan Jawaban / Menggambar Hasil')}
        </div>
      `;
    } else if (/^[-*•]\s+/.test(line)) {
      if (inOl) {
        closeLists();
      }
      if (!inUl) {
        html +=
          '<ul style="margin: 4px 0 8px 0; padding-left: 20px; line-height: 1.55; text-align: justify;">';
        inUl = true;
      }
      const bulletText = line.replace(/^[-*•]\s+/, '');
      html += `<li>${sanitize(bulletText)}</li>`;
    } else if (/^(\d+|[a-zA-Z])\.\s+/.test(line)) {
      if (inUl) {
        closeLists();
      }
      if (!inOl) {
        html +=
          '<ol style="margin: 4px 0 8px 0; padding-left: 20px; line-height: 1.55; text-align: justify;">';
        inOl = true;
      }
      const itemText = line.replace(/^(\d+|[a-zA-Z])\.\s+/, '');
      html += `<li>${sanitize(itemText)}</li>`;
    } else {
      closeLists();
      html += `<p style="margin: 4px 0 6px 0; line-height: 1.55; text-align: justify;">${sanitize(line)}</p>`;
    }
  }

  closeLists();
  return html || '<p>-</p>';
};

export const formatEvaluasiContent = (text: string): string => {
  if (!text) return '<p>-</p>';
  const normalized = normalizeSoalEvaluasi(text);
  const cleaned = sanitize(normalized);
  let questions = cleaned.split(/(?=(?:^|\n)\s*\d+\.\s+)/g).filter((q) => q.trim() !== '');
  if (questions.length <= 1) {
    questions = cleaned.split('\n\n').filter((q) => q.trim() !== '');
  }

  return questions
    .map((q, idx) => {
      const lines = expandInlineOptions(q.trim().split('\n').filter((l) => l.trim() !== ''));
      if (lines.length === 0) return '';

      const qPrompt = lines[0].replace(/^\d+\.\s*/, '');
      const otherLines = lines.slice(1);
      const hasOptions = otherLines.some((l) => /^[A-Da-d]\.\s+/.test(l.trim()));

      return `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <p style="margin: 0 0 4px 0; font-weight: bold; line-height: 1.45; text-align: justify;">
            ${idx + 1}. ${sanitize(qPrompt)}
          </p>
          ${
            hasOptions
              ? `
            <div style="margin-left: 15px; margin-top: 4px; line-height: 1.5;">
              ${otherLines.map((opt) => `<div style="margin-bottom: 2px;">${sanitize(opt)}</div>`).join('')}
            </div>
          `
              : otherLines.length > 0
                ? `
            <div style="margin-left: 15px; margin-top: 4px; line-height: 1.45; color: #444444;">
              ${otherLines.map((l) => `<div>${sanitize(l)}</div>`).join('')}
            </div>
            <div style="margin-left: 15px; margin-top: 8px; color: #777777; font-size: 10pt;">
              Jawab:<br/>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%; margin-top: 2px;"></div>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%;"></div>
            </div>
          `
                : `
            <div style="margin-left: 15px; margin-top: 8px; color: #777777; font-size: 10pt;">
              Jawab:<br/>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%; margin-top: 2px;"></div>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%;"></div>
            </div>
          `
          }
        </div>
      `;
    })
    .join('');
};

export const formatMateriContent = (text: string): string => {
  if (!text) return '<p>-</p>';
  const lines = text.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
    if (inOl) {
      html += '</ol>';
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeLists();
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      closeLists();
      const headingText = line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '');
      html += `<div style="font-weight: bold; font-size: 11pt; color: #1b5e20; margin: 10px 0 4px 0;">${sanitize(headingText)}</div>`;
    } else if (/^[-*•]\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        html +=
          '<ul style="margin: 4px 0 6px 0; padding-left: 20px; line-height: 1.5; list-style-type: disc;">';
        inUl = true;
      }
      html += `<li>${sanitize(line.replace(/^[-*•]\s+/, ''))}</li>`;
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        html += '<ol style="margin: 4px 0 6px 0; padding-left: 20px; line-height: 1.5;">';
        inOl = true;
      }
      html += `<li>${sanitize(line.replace(/^\d+\.\s+/, ''))}</li>`;
    } else {
      closeLists();
      html += `<p style="margin: 0 0 6px 0; line-height: 1.5; text-align: justify;">${sanitize(line)}</p>`;
    }
  }
  closeLists();
  return html;
};

export const formatKompetensiAwal = (value: string, formState?: Partial<FormState>): string => {
  const fallback = `Peserta didik telah mengenal konsep dasar yang berkaitan dengan ${sanitize(formState?.topik || formState?.mataPelajaran || 'materi pembelajaran')} pada pembelajaran sebelumnya serta mampu mengamati contoh sederhana di lingkungan sekitar.`;
  const items = expandInlineLkpdLines(String(value || '')).filter(Boolean);
  if (items.length === 0) return fallback;
  if (items.length === 1) return sanitize(items[0]);
  return `<ol style="margin: 0; padding-left: 20px; line-height: 1.5; text-align: justify;">${items
    .map((item) => `<li>${sanitize(item.replace(/^(\d+[.)]|[-*•])\s*/, ''))}</li>`)
    .join('')}</ol>`;
};

export const formatGlosariumContent = (glosarium: unknown): string => {
  if (glosarium && Array.isArray(glosarium) && glosarium.length > 0) {
    return `
      <ul style="margin: 0; padding-left: 20px; line-height: 1.5;">
        ${glosarium
          .map((g) => {
            const str = String(g).replace(/^[-*•]\s*/, '');
            const colonIdx = str.indexOf(':');
            if (colonIdx !== -1) {
              const term = str.substring(0, colonIdx).trim();
              const def = str.substring(colonIdx + 1).trim();
              return `<li style="margin-bottom: 4px;"><strong>${sanitize(term)}:</strong> ${sanitize(def)}</li>`;
            }
            return `<li style="margin-bottom: 4px;">${sanitize(str)}</li>`;
          })
          .join('')}
      </ul>
    `;
  }
  return `
    <ul style="margin: 0; padding-left: 20px; line-height: 1.5;">
      <li style="margin-bottom: 4px;"><strong>Diferensiasi:</strong> Penyesuaian proses dan konten pembelajaran berdasarkan kesiapan dan kebutuhan belajar siswa.</li>
      <li style="margin-bottom: 4px;"><strong>Asesmen Formatif:</strong> Penilaian yang bertujuan memantau proses perkembangan belajar dan memberikan umpan balik berkelanjutan.</li>
    </ul>
  `;
};
