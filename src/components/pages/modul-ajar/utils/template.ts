import { FormState } from '../types';
import { normalizeSoalEvaluasi } from '../../../../services/modulAjarAiGenerator';

export const buildHtmlTemplate = (formState: FormState, data: any, totalJP: number, logoBase64: string): string => {
  const sanitize = (text: any): string => {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\*\*/g, '')
      .replace(/❖/g, '-')
      .trim();
  };

  const listToHtml = (list: any): string => {
    if (!list) return '<li>-</li>';
    if (typeof list === 'string') {
      const arr = list.split('\n').filter(item => item.trim() !== '');
      return arr.length > 0 
        ? arr.map(item => `<li>${sanitize(item.replace(/^[-*•]\s*/, ''))}</li>`).join('') 
        : `<li>${sanitize(list)}</li>`;
    }
    if (!Array.isArray(list)) return `<li>${sanitize(String(list))}</li>`;
    if (list.length === 0) return '<li>-</li>';
    return list.map(item => `<li>${sanitize(typeof item === 'string' ? item.replace(/^[-*•]\s*/, '') : String(item))}</li>`).join('');
  };

  const listToNumberedHtml = (list: any): string => {
    if (!list) return '<li>-</li>';
    if (typeof list === 'string') {
      const arr = list.split('\n').filter(item => item.trim() !== '');
      return arr.length > 0 
        ? arr.map(item => `<li>${sanitize(item.replace(/^\d+\.\s*/, ''))}</li>`).join('') 
        : `<li>${sanitize(list)}</li>`;
    }
    if (!Array.isArray(list)) return `<li>${sanitize(String(list))}</li>`;
    if (list.length === 0) return '<li>-</li>';
    return list.map(item => `<li>${sanitize(typeof item === 'string' ? item.replace(/^\d+\.\s*/, '') : String(item))}</li>`).join('');
  };

  const formatStepList = (items: any): string => {
    if (!items) return '<div>-</div>';
    let rawList: string[] = [];
    if (typeof items === 'string') {
      rawList = items.split('\n').filter(l => l.trim() !== '');
    } else if (Array.isArray(items)) {
      rawList = items.map(it => String(it).trim()).filter(Boolean);
    } else {
      rawList = [String(items)];
    }
    if (rawList.length === 0) return '<div>-</div>';

    return `
      <ul style="margin: 4px 0; padding-left: 20px; line-height: 1.55; text-align: justify; list-style-type: disc;">
        ${rawList.map(item => {
          const colonIdx = item.indexOf(': ');
          if (colonIdx !== -1 && colonIdx < 65) {
            const title = item.substring(0, colonIdx);
            const desc = item.substring(colonIdx + 2);
            return `<li style="margin-bottom: 6px;"><strong>${sanitize(title)}:</strong> ${sanitize(desc)}</li>`;
          }
          return `<li style="margin-bottom: 6px;">${sanitize(item.replace(/^[-*•]\s*/, ''))}</li>`;
        }).join('')}
      </ul>
    `;
  };

  const formatActivityText = (text: string): string => {
    if (!text) return '-';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      return sanitize(text);
    }
    return lines.map(line => `<div style="margin-bottom: 4px;">• ${sanitize(line.replace(/^[-*•]\s*/, ''))}</div>`).join('');
  };

  const intiToHtml = (steps: any): string => {
    if (!steps) return '<div>-</div>';
    if (typeof steps === 'string') {
      return `<div style="line-height: 1.5; text-align: justify;">${sanitize(steps)}</div>`;
    }
    if (!Array.isArray(steps) || steps.length === 0) return '<div>-</div>';

    return steps.map((s, idx) => {
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
      
      const displayTitle = `Langkah ${idx + 1}: ${sanitize(title)}`;
      const guruContent = s.kegiatanGuru || s.guru || s.teacherActivity || s.kegiatan_guru || '';
      const siswaContent = s.kegiatanSiswa || s.siswa || s.studentActivity || s.kegiatan_siswa || '';

      return `
        <div style="margin-bottom: 14px; border: 1px solid #cfd8dc; border-radius: 6px; padding: 10px; background-color: #fafbfc; page-break-inside: avoid;">
          <div style="background-color: #e8f5e9; color: #0d6b3e; font-weight: bold; font-size: 10.5pt; padding: 6px 10px; border-left: 4px solid #0d6b3e; border-radius: 3px; margin-bottom: 6px;">
            ${displayTitle}
          </div>
          ${descriptionHtml}
          <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10pt; font-family: 'Times New Roman'; table-layout: fixed;">
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
    }).join('');
  };

  const formatLkpdContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const lines = text.split('\n');
    let html = '';
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    };

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeLists();
        continue;
      }

      if (/^#{1,4}\s+/.test(line) || /^(bagian\s*\d+|aktivitas\s*\d+|tahap\s*\d+|petunjuk\s*khusus|alat\s*dan\s*bahan)\s*:/i.test(line)) {
        closeLists();
        const headingText = line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '');
        html += `<div style="font-weight: bold; font-size: 11pt; color: #0d6b3e; margin: 12px 0 6px 0; border-bottom: 1px dashed #0d6b3e; padding-bottom: 3px;">${sanitize(headingText)}</div>`;
      }
      else if (/^\[(.*?)\]$/.test(line) || /^\[kotak/i.test(line)) {
        closeLists();
        const boxLabel = line.replace(/^\[|\]$/g, '').trim();
        html += `
          <div style="border: 1.5px dashed #666666; background-color: #fafafa; border-radius: 6px; padding: 16px; margin: 10px 0; text-align: center; color: #555555; font-style: italic; min-height: 60px;">
            ${sanitize(boxLabel || 'Tempat Menuliskan Jawaban / Menggambar Hasil')}
          </div>
        `;
      }
      else if (/^[-*•]\s+/.test(line)) {
        if (inOl) { closeLists(); }
        if (!inUl) {
          html += '<ul style="margin: 4px 0 8px 0; padding-left: 20px; line-height: 1.55; text-align: justify;">';
          inUl = true;
        }
        const bulletText = line.replace(/^[-*•]\s+/, '');
        html += `<li>${sanitize(bulletText)}</li>`;
      }
      else if (/^(\d+|[a-zA-Z])\.\s+/.test(line)) {
        if (inUl) { closeLists(); }
        if (!inOl) {
          html += '<ol style="margin: 4px 0 8px 0; padding-left: 20px; line-height: 1.55; text-align: justify;">';
          inOl = true;
        }
        const itemText = line.replace(/^(\d+|[a-zA-Z])\.\s+/, '');
        html += `<li>${sanitize(itemText)}</li>`;
      }
      else {
        closeLists();
        html += `<p style="margin: 4px 0 6px 0; line-height: 1.55; text-align: justify;">${sanitize(line)}</p>`;
      }
    }

    closeLists();
    return html || '<p>-</p>';
  };

  const formatEvaluasiContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const normalized = normalizeSoalEvaluasi(text);
    const cleaned = sanitize(normalized);
    
    let questions = cleaned.split(/(?=(?:^|\n)\s*\d+\.\s+)/g).filter(q => q.trim() !== '');
    if (questions.length <= 1) {
      questions = cleaned.split('\n\n').filter(q => q.trim() !== '');
    }

    return questions.map((q, idx) => {
      const lines = q.trim().split('\n').filter(l => l.trim() !== '');
      if (lines.length === 0) return '';
      
      const qPrompt = lines[0].replace(/^\d+\.\s*/, '');
      const otherLines = lines.slice(1);
      const hasOptions = otherLines.some(l => /^[A-Da-d]\.\s+/.test(l.trim()));
      
      return `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <p style="margin: 0 0 4px 0; font-weight: bold; line-height: 1.45; text-align: justify;">
            ${idx + 1}. ${sanitize(qPrompt)}
          </p>
          ${hasOptions ? `
            <div style="margin-left: 15px; margin-top: 4px; line-height: 1.5;">
              ${otherLines.map(opt => `<div style="margin-bottom: 2px;">${sanitize(opt)}</div>`).join('')}
            </div>
          ` : otherLines.length > 0 ? `
            <div style="margin-left: 15px; margin-top: 4px; line-height: 1.45; color: #444444;">
              ${otherLines.map(l => `<div>${sanitize(l)}</div>`).join('')}
            </div>
            <div style="margin-left: 15px; margin-top: 8px; color: #777777; font-size: 10pt;">
              Jawab:<br/>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%; margin-top: 2px;"></div>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%;"></div>
            </div>
          ` : `
            <div style="margin-left: 15px; margin-top: 8px; color: #777777; font-size: 10pt;">
              Jawab:<br/>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%; margin-top: 2px;"></div>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%;"></div>
            </div>
          `}
        </div>
      `;
    }).join('');
  };

  return `
    <div style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

      <!-- COVER PAGE -->
      <div style="text-align: center; margin-bottom: 20px; page-break-after: always; clear: both;">
        <div style="padding-top: 10px;">
          <h1 style="font-size: 16pt; margin: 0; font-weight: bold; font-family: 'Times New Roman';">PERANGKAT PEMBELAJARAN</h1>
          <h1 style="font-size: 16pt; margin: 5px 0 0 0; font-weight: bold; font-family: 'Times New Roman';">KURIKULUM MERDEKA</h1>
          <h2 style="font-size: 14pt; margin: 15px 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">${formState.documentType} ${formState.mataPelajaran}</h2>
          <h2 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">KELAS ${formState.kelas} ${formState.jenjang}</h2>
        </div>
        
        <!-- School Logo -->
        <div style="margin: 25px auto; text-align: center;">
          ${logoBase64 ? `
            <img src="${logoBase64}" alt="Logo Sekolah" style="width: 110px; height: 110px; object-fit: contain;" />
          ` : `
            <div style="width: 110px; height: 110px; border: 4px double #000000; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; padding: 5px; box-sizing: border-box;">
              <div style="font-size: 11pt; font-weight: bold; color: #000000; text-align: center; font-family: 'Times New Roman'; line-height: 1.3;">
                LOGO<br/>
                SEKOLAH
              </div>
            </div>
          `}
        </div>
        
        <div style="margin: 20px 0; font-size: 12pt; font-family: 'Times New Roman';">
          <p style="margin-bottom: 15px; font-weight: bold;">Disusun Oleh :</p>
          <table style="margin: 0 auto; text-align: left; font-size: 11pt; font-family: 'Times New Roman'; border: none;">
            <tr style="border: none;"><td style="padding: 4px 15px; border: none;">Nama Guru</td><td style="padding: 4px; border: none;">: <strong>${formState.guru || 'Guru Mata Pelajaran'}</strong></td></tr>
            <tr style="border: none;"><td style="padding: 4px 15px; border: none;">NIP/NIM</td><td style="padding: 4px; border: none;">: .......................................</td></tr>
          </table>
        </div>

        <div style="margin-top: 30px; padding-bottom: 10px; font-family: 'Times New Roman';">
          <h2 style="font-size: 14pt; margin: 5px 0; font-weight: bold; text-transform: uppercase;">${formState.satuanPendidikan}</h2>
          <h3 style="font-size: 12pt; margin: 5px 0; font-weight: bold;">TAHUN AJARAN ${formState.tahunAjaran}</h3>
        </div>
      </div>

      <!-- MAIN CONTENT PAGE BREAK -->
      <br style="page-break-before: always; clear: both;" />

      <!-- CONTENT HEADER -->
      <div style="text-align: center; margin-bottom: 20px; padding-top: 5px;">
        <h1 style="font-size: 14pt; margin: 0; font-weight: bold; font-family: 'Times New Roman'; text-transform: uppercase;">${formState.documentType.toUpperCase()} KURIKULUM MERDEKA</h1>
        <h2 style="font-size: 12pt; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">${formState.mataPelajaran} - KELAS ${formState.kelas} SEMESTER ${formState.semester}</h2>
      </div>

      <!-- 1. INFORMASI UMUM -->
      <div style="border: 1.5px solid #000000; margin-bottom: 18px; border-radius: 4px; overflow: hidden; page-break-inside: avoid;">
        <div style="background-color: #0d6b3e; color: #ffffff; padding: 8px 12px; font-weight: bold; font-size: 11.5pt; text-align: center;">
          INFORMASI UMUM
        </div>
        
        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          A. IDENTITAS MODUL
        </div>
        <div style="padding: 10px;">
          <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10.5pt; font-family: 'Times New Roman';">
            <tr style="border: none;"><td style="width: 32%; padding: 3px 0; border: none;">Nama Penyusun</td><td style="width: 3%; padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;"><strong>${formState.guru || 'Guru Mata Pelajaran'}</strong></td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Satuan Pendidikan</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">${formState.satuanPendidikan}</td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Tahun Penyusunan</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">Tahun ${formState.tahunAjaran}</td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Jenjang / Fase / Kelas</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">${formState.jenjang} / Fase ${formState.fase} / Kelas ${formState.kelas}</td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Mata Pelajaran</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">${formState.mataPelajaran}</td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Materi Pokok / Topik</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;"><strong>${formState.topik}</strong></td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Alokasi Waktu</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">${totalJP} JP (${formState.jumlahPertemuan} Pertemuan x ${formState.jpPerPertemuan} JP x ${formState.durasiPerJp} menit)</td></tr>
            ${(formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta') ? `
            <tr style="border: none; background-color: #e8f5e9;"><td style="padding: 4px; border: none; color: #1b5e20;"><strong>Integrasi Kurikulum</strong></td><td style="padding: 4px; border: none; color: #1b5e20;">:</td><td style="padding: 4px; border: none; color: #1b5e20;"><strong>Kurikulum Berbasis Cinta (KBC - Kemenag RI 2025)</strong></td></tr>
            ${formState.materiInsersi ? `<tr style="border: none; background-color: #e8f5e9;"><td style="padding: 4px; border: none; color: #1b5e20;"><strong>Materi Insersi KBC</strong></td><td style="padding: 4px; border: none; color: #1b5e20;">:</td><td style="padding: 4px; border: none; color: #1b5e20;">${sanitize(formState.materiInsersi)}</td></tr>` : ''}
            ` : ''}
          </table>
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          B. CAPAIAN PEMBELAJARAN (CP)
        </div>
        <div style="padding: 10px; text-align: justify; line-height: 1.5; font-size: 10.5pt;">
          ${sanitize(formState.capaianPembelajaran) || '<em>Capaian pembelajaran belum terisi.</em>'}
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          C. KOMPETENSI AWAL & PROFIL PELAJAR PANCASILA
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <p style="margin: 0 0 4px 0;"><strong>1. Kompetensi Awal (Prasyarat):</strong></p>
          <div style="margin: 0 0 12px 12px; text-align: justify; line-height: 1.45;">
            ${sanitize(formState.kompetensiAwal) || 'Peserta didik sebaiknya sudah memiliki pemahaman awal terkait topik pembelajaran ini.'}
          </div>

          <p style="margin: 0 0 4px 0;"><strong>2. Profil Pelajar Pancasila:</strong></p>
          <ul style="margin: 0 0 12px 0; padding-left: 25px; line-height: 1.45;">
            ${listToHtml(formState.profilPelajar)}
          </ul>

          <p style="margin: 0 0 4px 0;"><strong>3. Sarana dan Prasarana:</strong></p>
          <div style="margin: 0 0 12px 12px; text-align: justify; line-height: 1.45;">
            ${sanitize(formState.saranaPrasarana) || 'Ruang kelas, Papan Tulis, Spidol, Proyektor/Laptop, Alat Peraga Nyata, dan LKPD.'}
          </div>

          <p style="margin: 0 0 4px 0;"><strong>4. Target Peserta Didik:</strong></p>
          <div style="margin: 0 0 4px 12px; line-height: 1.45;">
            ${sanitize(formState.targetPeserta)}
          </div>
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          D. PENDEKATAN & MODEL PEMBELAJARAN
        </div>
        <div style="padding: 10px;">
          <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10.5pt; font-family: 'Times New Roman';">
            <tr style="border: none;"><td style="width: 32%; padding: 3px 0; border: none;">Pendekatan Pembelajaran</td><td style="width: 3%; padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">Kurikulum ${formState.curriculumApproach} (${formState.pendekatanPembelajaran || 'Student Centered'})</td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Model Pembelajaran</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;"><strong>${formState.modelPembelajaran}</strong></td></tr>
            <tr style="border: none;"><td style="padding: 3px 0; border: none;">Metode Utama</td><td style="padding: 3px 0; border: none;">:</td><td style="padding: 3px 0; border: none;">${formState.metodePembelajaran && formState.metodePembelajaran.length > 0 ? formState.metodePembelajaran.join(', ') : 'Demonstrasi, Eksplorasi, Diskusi Kelompok, Tanya Jawab, Penugasan'}</td></tr>
          </table>
        </div>
      </div>

      <!-- 2. KOMPONEN INTI -->
      <div style="border: 1.5px solid #000000; margin-bottom: 18px; border-radius: 4px; overflow: hidden;">
        <div style="background-color: #0d6b3e; color: #ffffff; padding: 8px 12px; font-weight: bold; font-size: 11.5pt; text-align: center;">
          KOMPONEN INTI
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          A. TUJUAN PEMBELAJARAN
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <ol style="margin: 0; padding-left: 22px; text-align: justify; line-height: 1.5;">
            ${listToNumberedHtml(data.tujuanPembelajaran)}
          </ol>
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          B. PEMAHAMAN BERMAKNA
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <ul style="margin: 0; padding-left: 22px; text-align: justify; line-height: 1.5; list-style-type: disc;">
            ${listToHtml(data.pemahamanBermakna)}
          </ul>
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          C. PERTANYAAN PEMANTIK
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <ul style="margin: 0; padding-left: 22px; text-align: justify; line-height: 1.5; list-style-type: disc;">
            ${listToHtml(data.pertanyaanPemantik)}
          </ul>
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          D. SKENARIO KEGIATAN PEMBELAJARAN
        </div>
        <div style="padding: 12px; font-size: 10.5pt;">
          
          <!-- 1. Pendahuluan -->
          <div style="margin-bottom: 15px; border-left: 3px solid #2e7d32; padding-left: 10px;">
            <div style="font-weight: bold; color: #1b5e20; font-size: 11pt; margin-bottom: 4px;">
              1. Kegiatan Pendahuluan (${formState.alokasiPendahuluan || 15} Menit)
            </div>
            ${formatStepList(data.kegiatanPendahuluan)}
          </div>

          <!-- 2. Kegiatan Inti -->
          <div style="margin-bottom: 15px; border-left: 3px solid #0d6b3e; padding-left: 10px;">
            <div style="font-weight: bold; color: #0d6b3e; font-size: 11pt; margin-bottom: 2px;">
              2. Kegiatan Inti (${formState.alokasiInti || 70} Menit)
            </div>
            <div style="margin-bottom: 8px; font-style: italic; font-size: 9.5pt; color: #555555;">
              Sintaks Model: ${formState.modelPembelajaran}
            </div>
            <div>
              ${intiToHtml(data.kegiatanInti)}
            </div>
          </div>

          <!-- 3. Penutup -->
          <div style="margin-bottom: 5px; border-left: 3px solid #e65100; padding-left: 10px;">
            <div style="font-weight: bold; color: #bf360c; font-size: 11pt; margin-bottom: 4px;">
              3. Kegiatan Penutup (${formState.alokasiPenutup || 15} Menit)
            </div>
            ${formatStepList(data.kegiatanPenutup)}
          </div>

        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          E. RANCANGAN ASESMEN
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <p style="margin: 0 0 4px 0;"><strong>1. Penilaian Sikap (Spiritual & Sosial):</strong></p>
          <div style="margin: 0 0 10px 12px; line-height: 1.45; text-align: justify;">
            ${sanitize(data.asesmenSikap) || 'Observasi sikap peserta didik selama kegiatan pembelajaran berlangsung.'}
          </div>

          <p style="margin: 0 0 4px 0;"><strong>2. Penilaian Keterampilan (Unjuk Kerja / Proyek):</strong></p>
          <div style="margin: 0 0 10px 12px; line-height: 1.45; text-align: justify;">
            ${sanitize(data.asesmenKeterampilan) || 'Penilaian performa diskusi kelompok, keaktifan kolaborasi, dan presentasi hasil karya.'}
          </div>

          <p style="margin: 0 0 4px 0;"><strong>3. Penilaian Pengetahuan:</strong></p>
          <div style="margin: 0 0 10px 12px; line-height: 1.45; text-align: justify;">
            ${sanitize(data.asesmenPengetahuan) || 'Tes tertulis/lisan pemahaman konsep pada lembar evaluasi di akhir pembelajaran.'}
          </div>

          ${formState.rubrikAsesmen && formState.rubrikAsesmen.length > 0 ? `
          <div style="margin-top: 12px;">
            <p style="margin: 0 0 6px 0;"><strong>4. Rubrik Penilaian Aktivitas Pembelajaran:</strong></p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 9.5pt; font-family: 'Times New Roman'; table-layout: fixed;">
              <thead>
                <tr style="background-color: #f2f2f2;">
                  <th style="border: 1px solid #000000; padding: 5px; width: 20%; text-align: center; font-weight: bold;">Kriteria</th>
                  <th style="border: 1px solid #000000; padding: 5px; width: 20%; text-align: center; font-weight: bold;">Sangat Baik (4)</th>
                  <th style="border: 1px solid #000000; padding: 5px; width: 20%; text-align: center; font-weight: bold;">Baik (3)</th>
                  <th style="border: 1px solid #000000; padding: 5px; width: 20%; text-align: center; font-weight: bold;">Cukup (2)</th>
                  <th style="border: 1px solid #000000; padding: 5px; width: 20%; text-align: center; font-weight: bold;">Perlu Bimbingan (1)</th>
                </tr>
              </thead>
              <tbody>
                ${formState.rubrikAsesmen.map(row => `
                  <tr>
                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">${sanitize(row.kriteria)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify; line-height: 1.35;">${sanitize(row.sangatBaik)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify; line-height: 1.35;">${sanitize(row.baik)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify; line-height: 1.35;">${sanitize(row.cukup)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify; line-height: 1.35;">${sanitize(row.perluBimbingan)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          F. KEGIATAN PENGAYAAN DAN REMEDIAL
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <p style="margin: 0 0 4px 0;"><strong>1. Program Pengayaan (Bagi siswa berprestasi / tuntas):</strong></p>
          <ul style="margin: 0 0 10px 0; padding-left: 25px; line-height: 1.45; text-align: justify;">
            ${listToHtml(data.pengayaan)}
          </ul>

          <p style="margin: 0 0 4px 0;"><strong>2. Program Remedial (Bagi siswa yang membutuhkan bimbingan):</strong></p>
          <ul style="margin: 0 0 4px 0; padding-left: 25px; line-height: 1.45; text-align: justify;">
            ${listToHtml(data.remedial)}
          </ul>
        </div>

        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          G. RENCANA PEMBELAJARAN BERDIFERENSIASI
        </div>
        <div style="padding: 10px; font-size: 10.5pt;">
          <p style="margin: 0 0 4px 0;"><strong>1. Diferensiasi Konten:</strong></p>
          <div style="margin: 0 0 8px 12px; line-height: 1.45; text-align: justify;">
            Menyediakan variasi sumber belajar materi ${formState.topik || formState.mataPelajaran} (benda konkret/alat peraga manipulatif bagi pembelajar kinestetik, infografis/gambar visual bagi pembelajar visual, serta teks bacaan terstruktur).
          </div>

          <p style="margin: 0 0 4px 0;"><strong>2. Diferensiasi Proses:</strong></p>
          <div style="margin: 0 0 8px 12px; line-height: 1.45; text-align: justify;">
            Memberikan bimbingan bertahap (scaffolding intensif) bagi peserta didik yang masih berkembang dan memberikan ruang eksplorasi mandiri serta tantangan pemecahan masalah tingkat tinggi (HOTS) bagi peserta didik yang telah mahir.
          </div>

          <p style="margin: 0 0 4px 0;"><strong>3. Diferensiasi Produk:</strong></p>
          <div style="margin: 0 0 4px 12px; line-height: 1.45; text-align: justify;">
            Peserta didik diberikan keleluasaan dalam menyajikan hasil pemecahan masalah ${formState.topik || formState.mataPelajaran} (dapat berupa lembar kerja tertulis, peta konsep/diagram alur, maupun demonstrasi peragaan lisan di depan kelas).
          </div>
        </div>
      </div>

      <!-- 3. LAMPIRAN PERANGKAT AJAR -->
      <div style="border: 1.5px solid #000000; margin-bottom: 18px; border-radius: 4px; overflow: hidden; page-break-before: always;">
        <div style="background-color: #0d6b3e; color: #ffffff; padding: 8px 12px; font-weight: bold; font-size: 11.5pt; text-align: center;">
          LAMPIRAN PERANGKAT AJAR
        </div>
        
        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          A. LEMBAR KERJA PESERTA DIDIK (LKPD) & LEMBAR EVALUASI
        </div>
        <div style="padding: 15px;">
          
          <!-- LKPD SHEET -->
          <div style="border: 2px dashed #000000; padding: 18px; margin-bottom: 25px; border-radius: 8px; page-break-inside: avoid;">
            <h3 style="text-align: center; margin: 0 0 12px 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
              LEMBAR KERJA PESERTA DIDIK (LKPD)
            </h3>
            
            <!-- Student Header Block -->
            <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
              <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Hari/Tanggal</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nama Kelompok</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
              <tr style="border: none;"><td style="border: none; padding: 2px;">Anggota</td><td style="border: none; padding: 2px;" colspan="3">: 1. ....................................  2. ....................................  3. ....................................</td></tr>
            </table>
            
            <div style="font-size: 10.5pt; line-height: 1.5;">
              ${formatLkpdContent(data.lkpdTugas)}
            </div>
            
            <!-- Write-in Lines for Students -->
            <div style="margin-top: 15px; page-break-inside: avoid;">
              <strong>Lembar Hasil Diskusi Kelompok:</strong>
              <div style="margin-top: 6px; color: #666666;">
                <div style="border-bottom: 1px dotted #888888; height: 24px; width: 100%;"></div>
                <div style="border-bottom: 1px dotted #888888; height: 24px; width: 100%;"></div>
                <div style="border-bottom: 1px dotted #888888; height: 24px; width: 100%;"></div>
                <div style="border-bottom: 1px dotted #888888; height: 24px; width: 100%;"></div>
              </div>
            </div>
          </div>

          <!-- EVALUATION SHEET -->
          <div style="border: 2px dashed #000000; padding: 18px; border-radius: 8px; page-break-before: always; page-break-inside: avoid;">
            <h3 style="text-align: center; margin: 0 0 12px 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
              LEMBAR EVALUASI PENGETAHUAN
            </h3>
            
            <!-- Student Header Block -->
            <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
              <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Nama Siswa</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nilai Evaluasi</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
              <tr style="border: none;"><td style="border: none; padding: 2px;">No. Absen</td><td style="border: none; padding: 2px;" colspan="3">: ...................................</td></tr>
            </table>

            <div style="font-size: 10.5pt; line-height: 1.5; margin-top: 8px;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Kerjakan soal-soal di bawah ini dengan teliti dan tepat!</p>
              <div>
                ${formatEvaluasiContent(data.soalEvaluasi)}
              </div>
            </div>
          </div>

          <!-- KUNCI JAWABAN (Guru only) -->
          ${data.kunciJawaban && Array.isArray(data.kunciJawaban) && data.kunciJawaban.length > 0 ? `
          <div style="margin-top: 18px; padding: 12px 15px; background-color: #f9f9f9; border: 1px solid #cccccc; border-radius: 4px; page-break-inside: avoid;">
            <div style="font-weight: bold; font-size: 10.5pt; color: #1b5e20; margin-bottom: 6px;">KUNCI JAWABAN & PEDOMAN PENSKORAN (REFERENSI GURU)</div>
            <ol style="margin: 0; padding-left: 20px; font-size: 10pt; line-height: 1.55;">
              ${data.kunciJawaban.map((k: string) => `<li>${sanitize(k.replace(/^\d+\.\s*/, ''))}</li>`).join('')}
            </ol>
          </div>
          ` : ''}

        </div>
        
        <!-- B. REFLEKSI GURU & PESERTA DIDIK -->
        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          B. LEMBAR REFLEKSI GURU & PESERTA DIDIK
        </div>
        <div style="padding: 10px; font-size: 10pt;">
          <p style="margin: 0 0 4px 0; font-weight: bold;">1. Refleksi Guru:</p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 10px; font-size: 9.5pt;">
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #000000; padding: 5px; width: 8%; text-align: center;">No</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 52%; text-align: left;">Pertanyaan Refleksi</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 40%; text-align: left;">Catatan Guru</th>
            </tr>
            <tr>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">1</td>
              <td style="border: 1px solid #000000; padding: 5px;">Apakah seluruh peserta didik mencapai tujuan pembelajaran?</td>
              <td style="border: 1px solid #000000; padding: 5px;">.......................................................</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">2</td>
              <td style="border: 1px solid #000000; padding: 5px;">Kendala apa yang dialami selama proses aktivitas pembelajaran?</td>
              <td style="border: 1px solid #000000; padding: 5px;">.......................................................</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">3</td>
              <td style="border: 1px solid #000000; padding: 5px;">Langkah perbaikan apa yang disiapkan untuk pertemuan berikutnya?</td>
              <td style="border: 1px solid #000000; padding: 5px;">.......................................................</td>
            </tr>
          </table>

          <p style="margin: 8px 0 4px 0; font-weight: bold;">2. Refleksi Peserta Didik:</p>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 9.5pt;">
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #000000; padding: 5px; width: 8%; text-align: center;">No</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 62%; text-align: left;">Pernyataan</th>
              <th style="border: 1px solid #000000; padding: 5px; width: 30%; text-align: center;">Jawaban (Ya / Tidak)</th>
            </tr>
            <tr>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">1</td>
              <td style="border: 1px solid #000000; padding: 5px;">Saya merasa senang dengan kegiatan belajar dan diskusi hari ini.</td>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">[ &nbsp; &nbsp; ]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">2</td>
              <td style="border: 1px solid #000000; padding: 5px;">Saya dapat memahami materi pelajaran yang disampaikan guru.</td>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">[ &nbsp; &nbsp; ]</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">3</td>
              <td style="border: 1px solid #000000; padding: 5px;">Saya aktif bekerjasama dalam kelompok selama menyelesaikan tugas.</td>
              <td style="border: 1px solid #000000; padding: 5px; text-align: center;">[ &nbsp; &nbsp; ]</td>
            </tr>
          </table>
        </div>

        <!-- C. GLOSARIUM -->
        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          C. GLOSARIUM
        </div>
        <div style="padding: 10px; font-size: 10pt; line-height: 1.5;">
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>${sanitize(formState.topik)}:</strong> Fokus kompetensi dan ruang lingkup materi pembelajaran yang dipelajari pada modul ajar ini.</li>
            <li><strong>Diferensiasi:</strong> Penyesuaian proses dan konten pembelajaran berdasarkan kesiapan dan kebutuhan belajar siswa.</li>
            <li><strong>Asesmen Formatif:</strong> Penilaian yang bertujuan memantau proses perkembangan belajar dan memberikan umpan balik berkelanjutan.</li>
          </ul>
        </div>

        <!-- D. DAFTAR PUSTAKA -->
        <div style="background-color: #f5f0d0; color: #000000; padding: 6px 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; font-size: 10.5pt;">
          D. DAFTAR PUSTAKA & REFERENSI
        </div>
        <div style="padding: 10px; font-size: 10.5pt; line-height: 1.5;">
          <ul style="margin: 0; padding-left: 25px;">
            ${listToHtml(data.daftarPustaka)}
          </ul>
        </div>

      </div>

      <!-- SIGNATURE BLOCK -->
      <table style="width: 100%; margin-top: 35px; font-size: 10.5pt; border: none; page-break-inside: avoid; font-family: 'Times New Roman';">
        <tr style="border: none;">
          <td style="width: 50%; text-align: center; border: none; padding: 10px; vertical-align: top;">
            Mengetahui,<br/>
            Kepala ${formState.satuanPendidikan}<br/><br/><br/><br/><br/>
            <strong><u>(......................................................)</u></strong><br/>
            NIP. ....................................................
          </td>
          <td style="width: 50%; text-align: center; border: none; padding: 10px; vertical-align: top;">
            ........................, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
            Guru Kelas / Mata Pelajaran<br/><br/><br/><br/><br/>
            <strong><u>${formState.guru || 'Guru Mata Pelajaran'}</u></strong><br/>
            NIP/NIM. ....................................................
          </td>
        </tr>
      </table>

    </div>
  `;
};

export const buildStudentHtmlTemplate = (formState: FormState, data: any, logoBase64: string): string => {
  const sanitize = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\*\*/g, '')
      .replace(/❖/g, '-')
      .trim();
  };

  const listToHtml = (list: string[]): string => {
    if (!list || list.length === 0) return '<li>-</li>';
    return list.map(item => `<li>${sanitize(item.replace(/^[-*•]\s*/, ''))}</li>`).join('');
  };

  const formatLkpdContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const lines = text.split('\n');
    let html = '';
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    };

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeLists();
        continue;
      }

      if (/^#{1,4}\s+/.test(line) || /^(bagian\s*\d+|aktivitas\s*\d+|tahap\s*\d+|petunjuk\s*khusus|alat\s*dan\s*bahan)\s*:/i.test(line)) {
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
        if (inOl) { closeLists(); }
        if (!inUl) {
          html += '<ul style="margin: 4px 0 8px 0; padding-left: 20px; line-height: 1.55; text-align: justify;">';
          inUl = true;
        }
        html += `<li>${sanitize(line.replace(/^[-*•]\s+/, ''))}</li>`;
      } else if (/^(\d+|[a-zA-Z])\.\s+/.test(line)) {
        if (inUl) { closeLists(); }
        if (!inOl) {
          html += '<ol style="margin: 4px 0 8px 0; padding-left: 20px; line-height: 1.55; text-align: justify;">';
          inOl = true;
        }
        html += `<li>${sanitize(line.replace(/^(\d+|[a-zA-Z])\.\s+/, ''))}</li>`;
      } else {
        closeLists();
        html += `<p style="margin: 4px 0 6px 0; line-height: 1.55; text-align: justify;">${sanitize(line)}</p>`;
      }
    }

    closeLists();
    return html || '<p>-</p>';
  };

  const formatEvaluasiContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const normalized = normalizeSoalEvaluasi(text);
    const cleaned = sanitize(normalized);
    let questions = cleaned.split(/(?=(?:^|\n)\s*\d+\.\s+)/g).filter(q => q.trim() !== '');
    if (questions.length <= 1) {
      questions = cleaned.split('\n\n').filter(q => q.trim() !== '');
    }

    return questions.map((q, idx) => {
      const lines = q.trim().split('\n').filter(l => l.trim() !== '');
      if (lines.length === 0) return '';
      
      const qPrompt = lines[0].replace(/^\d+\.\s*/, '');
      const otherLines = lines.slice(1);
      const hasOptions = otherLines.some(l => /^[A-Da-d]\.\s+/.test(l.trim()));
      
      return `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <p style="margin: 0 0 4px 0; font-weight: bold; line-height: 1.45; text-align: justify;">
            ${idx + 1}. ${sanitize(qPrompt)}
          </p>
          ${hasOptions ? `
            <div style="margin-left: 15px; margin-top: 4px; line-height: 1.5;">
              ${otherLines.map(opt => `<div style="margin-bottom: 2px;">${sanitize(opt)}</div>`).join('')}
            </div>
          ` : otherLines.length > 0 ? `
            <div style="margin-left: 15px; margin-top: 4px; line-height: 1.45; color: #444444;">
              ${otherLines.map(l => `<div>${sanitize(l)}</div>`).join('')}
            </div>
            <div style="margin-left: 15px; margin-top: 8px; color: #777777; font-size: 10pt;">
              Jawab:<br/>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%; margin-top: 2px;"></div>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%;"></div>
            </div>
          ` : `
            <div style="margin-left: 15px; margin-top: 8px; color: #777777; font-size: 10pt;">
              Jawab:<br/>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%; margin-top: 2px;"></div>
              <div style="border-bottom: 1px dotted #888888; height: 22px; width: 96%;"></div>
            </div>
          `}
        </div>
      `;
    }).join('');
  };

  return `
    <div style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

      <!-- COVER PAGE SISWA -->
      <div style="text-align: center; margin-bottom: 30px; page-break-after: always; clear: both;">
        <div style="padding-top: 30px;">
          <h1 style="font-size: 16pt; margin: 0; font-weight: bold; font-family: 'Times New Roman';">LEMBAR AKTIVITAS & EVALUASI SISWA</h1>
          <h1 style="font-size: 16pt; margin: 5px 0 0 0; font-weight: bold; font-family: 'Times New Roman';">KURIKULUM MERDEKA</h1>
          <h2 style="font-size: 14pt; margin: 15px 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">${formState.mataPelajaran}</h2>
          <h2 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">KELAS ${formState.kelas} (FASE ${formState.fase})</h2>
        </div>
        
        <div style="margin: 35px auto; text-align: center;">
          ${logoBase64 ? `
            <img src="${logoBase64}" alt="Logo Sekolah" style="width: 120px; height: 120px; object-fit: contain;" />
          ` : `
            <div style="width: 120px; height: 120px; border: 4px double #000000; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; padding: 5px; box-sizing: border-box;">
              <div style="font-size: 11pt; font-weight: bold; color: #000000; text-align: center; font-family: 'Times New Roman'; line-height: 1.3;">
                LOGO<br/>
                SEKOLAH
              </div>
            </div>
          `}
        </div>

        <div style="margin: 30px 0; font-size: 12pt; font-family: 'Times New Roman';">
          <table style="margin: 0 auto; text-align: left; font-size: 11pt; font-family: 'Times New Roman'; border: none;">
            <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Materi Pokok</td><td style="padding: 5px; border: none;">: ${formState.topik}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Satuan Pendidikan</td><td style="padding: 5px; border: none;">: ${formState.satuanPendidikan}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Tahun Ajaran</td><td style="padding: 5px; border: none;">: ${formState.tahunAjaran}</td></tr>
          </table>
        </div>

        <div style="margin-top: 60px; padding-bottom: 20px; font-family: 'Times New Roman'; font-style: italic; color: #555555;">
          "Semangat Belajar! Lakukan yang Terbaik."
        </div>
      </div>

      <!-- PAGE BREAK -->
      <br style="page-break-before: always; clear: both;" />

      <!-- LKPD SHEET -->
      <div style="border: 2px dashed #000000; padding: 20px; margin-bottom: 25px; border-radius: 8px; page-break-inside: avoid; font-family: 'Times New Roman';">
        <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          LEMBAR KERJA PESERTA DIDIK (LKPD)
        </h3>
        
        <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
          <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Hari/Tanggal</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nama Kelompok</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
          <tr style="border: none;"><td style="border: none; padding: 2px;">Anggota</td><td style="border: none; padding: 2px;" colspan="3">: 1. ....................................  2. ....................................  3. ....................................</td></tr>
        </table>
        
        <div style="font-size: 10.5pt; line-height: 1.5;">
          ${formatLkpdContent(data.lkpdTugas)}
        </div>
        
        <div style="margin-top: 15px;">
          <strong>Lembar Hasil Diskusi Kelompok:</strong>
          <div style="margin-top: 8px; color: #666666;">
            <div style="border-bottom: 1px dotted #888888; height: 25px; width: 100%;"></div>
            <div style="border-bottom: 1px dotted #888888; height: 25px; width: 100%;"></div>
            <div style="border-bottom: 1px dotted #888888; height: 25px; width: 100%;"></div>
            <div style="border-bottom: 1px dotted #888888; height: 25px; width: 100%;"></div>
          </div>
        </div>
      </div>

      <!-- PAGE BREAK -->
      <br style="page-break-before: always; clear: both;" />

      <!-- EVALUATION SHEET -->
      <div style="border: 2px dashed #000000; padding: 20px; border-radius: 8px; page-break-inside: avoid; font-family: 'Times New Roman';">
        <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          LEMBAR EVALUASI PENGETAHUAN
        </h3>
        
        <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
          <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Nama Siswa</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nilai Evaluasi</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
          <tr style="border: none;"><td style="border: none; padding: 2px;">No. Absen</td><td style="border: none; padding: 2px;" colspan="3">: ...................................</td></tr>
        </table>

        <div style="font-size: 10.5pt; line-height: 1.5; margin-top: 10px;">
          <p style="margin: 0 0 10px 0; font-weight: bold;">Kerjakan soal-soal di bawah ini dengan tepat!</p>
          <div>
            ${formatEvaluasiContent(data.soalEvaluasi)}
          </div>
        </div>
      </div>

      <!-- SIGNATURE BLOCK -->
      <div style="margin-top: 40px; page-break-inside: avoid; font-family: 'Times New Roman'; font-size: 10.5pt;">
        <table style="width: 100%; border: none;">
          <tr style="border: none;">
            <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
              Mengetahui,<br/>
              Kepala ${formState.satuanPendidikan}<br/><br/><br/><br/><br/>
              <strong><u>.......................................................</u></strong><br/>
              NIP. ...................................................
            </td>
            <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
              Guru Mata Pelajaran,<br/><br/><br/><br/><br/>
              <strong><u>${formState.guru || '...................................................'}</u></strong><br/>
              NIP. ...................................................
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; font-size: 10pt; line-height: 1.4; font-family: 'Times New Roman'; text-align: left;">
        <strong>Daftar Pustaka & Referensi Belajar:</strong>
        <ul style="margin: 5px 0 0 0; padding-left: 20px;">
          ${listToHtml(data.daftarPustaka)}
        </ul>
      </div>

    </div>
  `;
};

export const extractStudentHtml = (fullHtml: string, formState: FormState, logoBase64: string): string => {
  if (!fullHtml) return '';
  if (typeof window !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHtml, 'text/html');
      
      const dashedBoxes = Array.from(doc.querySelectorAll('div')).filter(el => {
        const style = el.getAttribute('style') || '';
        return style.includes('dashed');
      });

      const listItems = Array.from(doc.querySelectorAll('td, div')).filter(el => {
        const text = el.textContent || '';
        return text.includes('DAFTAR PUSTAKA');
      });
      const bibliographyHtml = listItems.length > 0 && listItems[0].nextElementSibling 
        ? listItems[0].nextElementSibling.innerHTML 
        : '';

      if (dashedBoxes.length >= 2) {
        const lkpdHtml = dashedBoxes[0].outerHTML;
        const evaluasiHtml = dashedBoxes[1].outerHTML;
        
        return `
          <div style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- COVER PAGE SISWA -->
            <div style="text-align: center; margin-bottom: 20px; page-break-after: always; clear: both;">
              <div style="padding-top: 10px;">
                <h1 style="font-size: 16pt; margin: 0; font-weight: bold; font-family: 'Times New Roman';">LEMBAR AKTIVITAS & EVALUASI SISWA</h1>
                <h1 style="font-size: 16pt; margin: 5px 0 0 0; font-weight: bold; font-family: 'Times New Roman';">KURIKULUM MERDEKA</h1>
                <h2 style="font-size: 14pt; margin: 15px 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">${formState.mataPelajaran}</h2>
                <h2 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">KELAS ${formState.kelas} (FASE ${formState.fase})</h2>
              </div>
              
              <div style="margin: 25px auto; text-align: center;">
                ${logoBase64 ? `
                  <img src="${logoBase64}" alt="Logo Sekolah" style="width: 110px; height: 110px; object-fit: contain;" />
                ` : `
                  <div style="width: 110px; height: 110px; border: 4px double #000000; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; padding: 5px; box-sizing: border-box;">
                    <div style="font-size: 11pt; font-weight: bold; color: #000000; text-align: center; font-family: 'Times New Roman'; line-height: 1.3;">
                      LOGO<br/>
                      SEKOLAH
                    </div>
                  </div>
                `}
              </div>

              <div style="margin: 20px 0; font-size: 12pt; font-family: 'Times New Roman';">
                <table style="margin: 0 auto; text-align: left; font-size: 11pt; font-family: 'Times New Roman'; border: none;">
                  <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Materi Pokok</td><td style="padding: 5px; border: none;">: ${formState.topik}</td></tr>
                  <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Satuan Pendidikan</td><td style="padding: 5px; border: none;">: ${formState.satuanPendidikan}</td></tr>
                  <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Tahun Ajaran</td><td style="padding: 5px; border: none;">: ${formState.tahunAjaran}</td></tr>
                </table>
              </div>

              <div style="margin-top: 35px; padding-bottom: 10px; font-family: 'Times New Roman'; font-style: italic; color: #555555;">
                "Semangat Belajar! Lakukan yang Terbaik."
              </div>
            </div>

            <!-- PAGE BREAK -->
            <br style="page-break-before: always; clear: both;" />
            
            <div style="padding: 15px; border: 1px solid #000000;">
              ${lkpdHtml}
              <br style="page-break-before: always; clear: both;" />
              ${evaluasiHtml}
            </div>

            ${bibliographyHtml ? `
              <div style="margin-top: 30px; font-size: 10pt; line-height: 1.4; font-family: 'Times New Roman'; text-align: left;">
                <strong>Daftar Pustaka & Referensi Belajar:</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                  ${bibliographyHtml}
                </ul>
              </div>
            ` : ''}
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to parse student HTML:', err);
    }
  }
  return fullHtml;
};
