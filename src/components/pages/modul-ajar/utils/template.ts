import { FormState } from '../types';

export const buildHtmlTemplate = (formState: FormState, data: any, totalJP: number, logoBase64: string): string => {
  // Helper to sanitize markdown markers like **, *, __ and convert to HTML or clean up
  const sanitize = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert **bold** to <strong>
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Convert *italic* to <em>
      .replace(/\*\*/g, '') // Clean any stray double asterisks
      .replace(/❖/g, '-') // Replace unicode diamonds which break in MS Word
      .trim();
  };

  const listToHtml = (list: any) => {
    if (!list) return '<li>-</li>';
    if (typeof list === 'string') {
      const arr = list.split('\n').filter(item => item.trim() !== '');
      return arr.length > 0 ? arr.map(item => `<li>${sanitize(item)}</li>`).join('') : `<li>${sanitize(list)}</li>`;
    }
    if (!Array.isArray(list)) return `<li>${sanitize(String(list))}</li>`;
    if (list.length === 0) return '<li>-</li>';
    return list.map(item => `<li>${sanitize(typeof item === 'string' ? item : String(item))}</li>`).join('');
  };

  const listToNumberedHtml = (list: any) => {
    if (!list) return '<li>-</li>';
    if (typeof list === 'string') {
      const arr = list.split('\n').filter(item => item.trim() !== '');
      return arr.length > 0 ? arr.map(item => `<li>${sanitize(item)}</li>`).join('') : `<li>${sanitize(list)}</li>`;
    }
    if (!Array.isArray(list)) return `<li>${sanitize(String(list))}</li>`;
    if (list.length === 0) return '<li>-</li>';
    return list.map(item => `<li>${sanitize(typeof item === 'string' ? item : String(item))}</li>`).join('');
  };

  const intiToHtml = (steps: any[]) => {
    if (!steps || steps.length === 0) return '<div>-</div>';
    return steps.map((s, idx) => {
      const faseRaw = s.fase || s.nama_fase || '';
      // Clean prefix if starts with "Langkah X:"
      const cleanedFase = faseRaw.replace(/^langkah\s*\d+\s*:\s*/i, '').trim();
      
      let title = cleanedFase;
      let descriptionHtml = '';
      
      // Split title and description if separated by a dot and a space
      const dotIndex = cleanedFase.indexOf('. ');
      if (dotIndex !== -1) {
        title = cleanedFase.substring(0, dotIndex);
        const description = cleanedFase.substring(dotIndex + 2).trim();
        if (description) {
          descriptionHtml = `<div style="margin: 4px 0 8px 0; font-size: 10pt; color: #555555; font-style: italic; line-height: 1.4;">${sanitize(description)}</div>`;
        }
      }
      
      const displayTitle = `Langkah ${idx + 1}: ${sanitize(title)}`;

      return `
        <div style="margin-bottom: 12px; border-bottom: 1px dashed #cccccc; padding-bottom: 8px; page-break-inside: avoid;">
          <strong>${displayTitle}</strong>
          ${descriptionHtml}
          <ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
            <li><strong>Kegiatan Guru:</strong> ${sanitize(s.kegiatanGuru || s.guru || '')}</li>
            <li><strong>Kegiatan Siswa:</strong> ${sanitize(s.kegiatanSiswa || s.siswa || '')}</li>
          </ul>
        </div>
      `;
    }).join('');
  };

  // Helper to split paragraph text into bullet lists for LKPD
  const formatLkpdContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      return `<p style="margin: 0; text-align: justify; line-height: 1.5;">${sanitize(text)}</p>`;
    }
    return `
      <ol style="margin: 0; padding-left: 20px; line-height: 1.6; text-align: justify;">
        ${lines.map(line => `<li>${sanitize(line.replace(/^\d+\.\s*/, ''))}</li>`).join('')}
      </ol>
    `;
  };

  // Helper to split evaluation questions and add write-in dotted lines
  const formatEvaluasiContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const cleaned = sanitize(text);
    // Split by number patterns like 1. , 2. , 3. or newlines
    let questions = cleaned.split(/(?=\d+\.\s)/g);
    if (questions.length <= 1) {
      questions = cleaned.split('\n').filter(q => q.trim() !== '');
    }
    
    return questions.map((q, idx) => {
      if (!q.trim()) return '';
      // Clean leading number if split didn't catch it cleanly
      const qText = q.trim().replace(/^\d+\.\s*/, '');
      return `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <p style="margin: 0 0 6px 0; font-weight: bold; line-height: 1.4;">${idx + 1}. ${qText}</p>
          <div style="margin-left: 15px; margin-top: 6px; color: #666666; font-size: 10pt;">
            Jawab:<br/>
            <div style="border-bottom: 1px dotted #888888; height: 22px; width: 95%; margin-top: 2px;"></div>
            <div style="border-bottom: 1px dotted #888888; height: 22px; width: 95%;"></div>
          </div>
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
        
        <!-- School Logo (Base64 Data URI) -->
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
            <tr style="border: none;"><td style="padding: 5px 15px; border: none;">Nama Guru</td><td style="padding: 5px; border: none;">: ${formState.guru}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 15px; border: none;">NIP/NIM</td><td style="padding: 5px; border: none;">: .......................................</td></tr>
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
      <div style="text-align: center; margin-bottom: 25px; padding-top: 10px;">
        <h1 style="font-size: 14pt; margin: 0; font-weight: bold; font-family: 'Times New Roman'; uppercase;">${formState.documentType.toUpperCase()} KURIKULUM MERDEKA</h1>
        <h2 style="font-size: 12pt; margin: 6px 0 0 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">${formState.mataPelajaran} - KELAS ${formState.kelas} SEMESTER ${formState.semester}</h2>
      </div>

      <!-- MAIN TABLE STRUCTURE -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #000000; font-size: 11pt; font-family: 'Times New Roman'; table-layout: fixed;">
        
        <!-- INFORMASI UMUM -->
        <tr style="page-break-inside: avoid;">
          <td style="background-color: #00b050; color: #ffffff; padding: 10px; font-weight: bold; border: 2px solid #000000; font-size: 12pt; text-align: center;">INFORMASI UMUM</td>
        </tr>
        
        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">A. IDENTITAS MODUL</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr style="border: none;"><td style="width: 35%; padding: 4px; border: none;">Nama Penyusun</td><td style="width: 5%; padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;"><strong>${formState.guru}</strong></td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Nama Sekolah</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${formState.satuanPendidikan}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Tahun Penyusunan</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">Tahun ${formState.tahunAjaran}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Jenjang / Fase / Kelas</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${formState.jenjang} / Fase ${formState.fase} / Kelas ${formState.kelas}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Mata Pelajaran</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${formState.mataPelajaran}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Materi Pokok / Topik</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${formState.topik}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Alokasi Waktu</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${totalJP} JP (${formState.jumlahPertemuan} Pertemuan x ${formState.durasiPerJp} menit)</td></tr>
              ${(formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta') ? `
              <tr style="border: none; background-color: #e6f4ea;"><td style="padding: 4px; border: none; color: #137333;"><strong>Integrasi Kurikulum</strong></td><td style="padding: 4px; border: none; color: #137333;">:</td><td style="padding: 4px; border: none; color: #137333;"><strong>Kurikulum Berbasis Cinta (KBC - Kemenag RI 2025)</strong></td></tr>
              ${formState.materiInsersi ? `<tr style="border: none; background-color: #e6f4ea;"><td style="padding: 4px; border: none; color: #137333;"><strong>Materi Insersi KBC</strong></td><td style="padding: 4px; border: none; color: #137333;">:</td><td style="padding: 4px; border: none; color: #137333;">${sanitize(formState.materiInsersi)}</td></tr>` : ''}
              ` : ''}
            </table>
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">B. CAPAIAN PEMBELAJARAN (CP)</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000; text-align: justify; line-height: 1.5;">
            ${sanitize(formState.capaianPembelajaran) || '<em>Capaian pembelajaran belum terisi.</em>'}
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">C. KOMPETENSI AWAL & PROFIL PELAJAR PANCASILA</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 6px 0;"><strong>1. Kompetensi Awal (Prasyarat):</strong></p>
            <div style="margin: 0 0 15px 15px; text-align: justify; line-height: 1.4;">
              ${sanitize(formState.kompetensiAwal) || 'Peserta didik sebaiknya sudah memiliki pemahaman awal terkait topik pembelajaran ini.'}
            </div>

            <p style="margin: 0 0 6px 0;"><strong>2. Profil Pelajar Pancasila:</strong></p>
            <ul style="margin: 0 0 15px 0; padding-left: 25px; line-height: 1.4;">
              ${listToHtml(formState.profilPelajar)}
            </ul>

            <p style="margin: 0 0 6px 0;"><strong>3. Sarana dan Prasarana:</strong></p>
            <div style="margin: 0 0 15px 15px; text-align: justify; line-height: 1.4;">
              ${sanitize(formState.saranaPrasarana) || 'Ruang kelas, Papan Tulis, Spidol, Proyektor/Laptop, dan Lembar Aktivitas.'}
            </div>

            <p style="margin: 0 0 6px 0;"><strong>4. Target Peserta Didik:</strong></p>
            <div style="margin: 0 0 5px 15px; line-height: 1.4;">
              ${sanitize(formState.targetPeserta)}
            </div>
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">D. PENDEKATAN & MODEL PEMBELAJARAN</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr style="border: none;"><td style="width: 35%; padding: 4px; border: none;">Pendekatan Kurikulum</td><td style="width: 5%; padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">Kurikulum ${formState.curriculumApproach}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Model Pembelajaran</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${formState.modelPembelajaran}</td></tr>
              <tr style="border: none;"><td style="padding: 4px; border: none;">Metode Utama</td><td style="padding: 4px; border: none;">:</td><td style="padding: 4px; border: none;">${formState.metodePembelajaran.length > 0 ? formState.metodePembelajaran.join(', ') : 'Diskusi, Tanya Jawab, Ceramah'}</td></tr>
            </table>
          </td>
        </tr>

        <!-- KOMPONEN INTI -->
        <tr style="page-break-inside: avoid;">
          <td style="background-color: #00b050; color: #ffffff; padding: 10px; font-weight: bold; border: 2px solid #000000; font-size: 12pt; text-align: center;">KOMPONEN INTI</td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">A. TUJUAN PEMBELAJARAN</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <ul style="margin: 0; padding-left: 25px; text-align: justify; line-height: 1.5;">
              ${listToNumberedHtml(data.tujuanPembelajaran)}
            </ul>
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">B. PEMAHAMAN BERMAKNA</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <ul style="margin: 0; padding-left: 25px; line-height: 1.5;">
              ${listToHtml(data.pemahamanBermakna)}
            </ul>
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">C. PERTANYAAN PEMANTIK</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <ul style="margin: 0; padding-left: 25px; line-height: 1.5;">
              ${listToHtml(data.pertanyaanPemantik)}
            </ul>
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">D. SKENARIO KEGIATAN PEMBELAJARAN</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">1. Kegiatan Pendahuluan (${formState.alokasiPendahuluan || 15} Menit)</p>
            <ol style="margin: 0; padding-left: 25px; text-align: justify; line-height: 1.5;">
              ${listToHtml(data.kegiatanPendahuluan)}
            </ol>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">2. Kegiatan Inti (${formState.alokasiInti || 70} Menit)</p>
            <p style="margin: 0 0 10px 15px; font-style: italic; font-size: 10pt; color: #444444;">Pendekatan Skenario: Model ${formState.modelPembelajaran}</p>
            <div style="margin: 0 0 0 15px; text-align: justify;">
              ${intiToHtml(data.kegiatanInti)}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">3. Kegiatan Penutup (${formState.alokasiPenutup || 15} Menit)</p>
            <ol style="margin: 0; padding-left: 25px; text-align: justify; line-height: 1.5;">
              ${listToHtml(data.kegiatanPenutup)}
            </ol>
          </td>
        </tr>

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">E. RANCANGAN ASESMEN</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 5px 0;"><strong>1. Penilaian Sikap (Spiritual & Sosial):</strong></p>
            <ul style="margin: 0; padding-left: 25px; line-height: 1.4;">
              ${listToHtml(data.asesmenSikap)}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 5px 0;"><strong>2. Penilaian Keterampilan (Unjuk Kerja / Proyek):</strong></p>
            <ul style="margin: 0; padding-left: 25px; line-height: 1.4;">
              ${listToHtml(data.asesmenKeterampilan)}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 5px 0;"><strong>3. Penilaian Pengetahuan:</strong></p>
            <div style="margin: 0; line-height: 1.4; text-align: justify;">
              ${sanitize(data.asesmenPengetahuan)}
            </div>
          </td>
        </tr>
        ${formState.rubrikAsesmen && formState.rubrikAsesmen.length > 0 ? `
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 6px 0;"><strong>4. Rubrik Asesmen Aktivitas Pembelajaran:</strong></p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 9.5pt; font-family: 'Times New Roman'; margin-top: 5px; table-layout: fixed;">
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
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify;">${sanitize(row.sangatBaik)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify;">${sanitize(row.baik)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify;">${sanitize(row.cukup)}</td>
                    <td style="border: 1px solid #000000; padding: 5px; text-align: justify;">${sanitize(row.perluBimbingan)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </td>
        </tr>
        ` : ''}

        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">F. KEGIATAN PENGAYAAN DAN REMEDIAL</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 5px 0;"><strong>1. Program Pengayaan (Bagi siswa berprestasi):</strong></p>
            <ul style="margin: 0; padding-left: 25px; line-height: 1.4;">
              ${listToHtml(data.pengayaan)}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000;">
            <p style="margin: 0 0 5px 0;"><strong>2. Program Remedial (Bagi siswa berkebutuhan khusus/kurang):</strong></p>
            <ul style="margin: 0; padding-left: 25px; line-height: 1.4;">
              ${listToHtml(data.remedial)}
            </ul>
          </td>
        </tr>

        <!-- LAMPIRAN SECTION -->
        <tr style="page-break-inside: avoid;">
          <td style="background-color: #00b050; color: #ffffff; padding: 10px; font-weight: bold; border: 2px solid #000000; font-size: 12pt; text-align: center;">LAMPIRAN PERANGKAT AJAR</td>
        </tr>
        
        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">A. LEMBAR KERJA PESERTA DIDIK (LKPD) & LEMBAR EVALUASI</td>
        </tr>
        <tr>
          <td style="padding: 15px; border: 1px solid #000000;">
            
            <!-- EXCELLENT CLASSROOM LKPD SHEET -->
            <div style="border: 2px dashed #000000; padding: 20px; margin-bottom: 25px; border-radius: 8px; page-break-inside: avoid;">
              <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline;">LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
              
              <!-- Student Header Block -->
              <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Hari/Tanggal</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nama Kelompok</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">Anggota</td><td style="border: none; padding: 2px;" colspan="3">: 1. ....................................  2. ....................................  3. ....................................</td></tr>
              </table>
              
              <div style="margin-bottom: 15px; font-size: 11pt; line-height: 1.5;">
                <strong>Aktivitas Tugas Kelompok:</strong>
                <div style="margin-top: 5px;">
                  ${formatLkpdContent(data.lkpdTugas)}
                </div>
              </div>
              
              <!-- Write-in Lines for Students -->
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

            <!-- EXCELLENT EVALUATION SHEET -->
            <div style="border: 2px dashed #000000; padding: 20px; border-radius: 8px; page-break-inside: avoid;">
              <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline;">LEMBAR EVALUASI PENGETAHUAN</h3>
              
              <!-- Student Header Block -->
              <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
                <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Nama Siswa</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nilai Evaluasi</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
                <tr style="border: none;"><td style="border: none; padding: 2px;">No. Absen</td><td style="border: none; padding: 2px;" colspan="3">: ...................................</td></tr>
              </table>

              <div style="font-size: 11pt; line-height: 1.5; margin-top: 10px;">
                <strong>Kerjakan soal-soal di bawah ini dengan tepat!</strong>
                <div style="margin-top: 10px;">
                  ${formatEvaluasiContent(data.soalEvaluasi)}
                </div>
              </div>
            </div>

          </td>
        </tr>
        
        <tr style="page-break-inside: avoid;">
          <td style="background-color: #ffff00; color: #000000; padding: 8px; font-weight: bold; border: 1px solid #000000;">B. DAFTAR PUSTAKA & REFERENSI</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #000000; font-size: 11pt; line-height: 1.5;">
            <ul style="margin: 0; padding-left: 25px;">
              ${listToHtml(data.daftarPustaka)}
            </ul>
          </td>
        </tr>

      </table>

      <!-- SIGNATURE BLOCK (Avoids orphan formatting in Word) -->
      <table style="width: 100%; margin-top: 50px; font-size: 11pt; border: none; page-break-inside: avoid; font-family: 'Times New Roman';">
        <tr style="border: none;">
          <td style="width: 50%; text-align: center; border: none; padding: 10px;">
            Mengetahui,<br/>
            Kepala ${formState.satuanPendidikan}<br/><br/><br/><br/><br/>
            <strong><u>(..........................................)</u></strong><br/>
            NIP. .....................................
          </td>
          <td style="width: 50%; text-align: center; border: none; padding: 10px;">
            ........................, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
            Guru Kelas / Mata Pelajaran<br/><br/><br/><br/><br/>
            <strong><u>${formState.guru}</u></strong><br/>
            NIP/NIM. .....................................
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

  const listToHtml = (list: string[]) => {
    if (!list || list.length === 0) return '<li>-</li>';
    return list.map(item => `<li>${sanitize(item)}</li>`).join('');
  };

  const formatLkpdContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      return `<p style="margin: 0; text-align: justify; line-height: 1.5;">${sanitize(text)}</p>`;
    }
    return `
      <ol style="margin: 0; padding-left: 20px; line-height: 1.6; text-align: justify;">
        ${lines.map(line => `<li>${sanitize(line.replace(/^\d+\.\s*/, ''))}</li>`).join('')}
      </ol>
    `;
  };

  const formatEvaluasiContent = (text: string): string => {
    if (!text) return '<p>-</p>';
    const cleaned = sanitize(text);
    let questions = cleaned.split(/(?=\d+\.\s)/g);
    if (questions.length <= 1) {
      questions = cleaned.split('\n').filter(q => q.trim() !== '');
    }
    
    return questions.map((q, idx) => {
      if (!q.trim()) return '';
      const qText = q.trim().replace(/^\d+\.\s*/, '');
      return `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <p style="margin: 0 0 6px 0; font-weight: bold; line-height: 1.4;">${idx + 1}. ${qText}</p>
          <div style="margin-left: 15px; margin-top: 6px; color: #666666; font-size: 10pt;">
            Jawab:<br/>
            <div style="border-bottom: 1px dotted #888888; height: 22px; width: 95%; margin-top: 2px;"></div>
            <div style="border-bottom: 1px dotted #888888; height: 22px; width: 95%;"></div>
          </div>
        </div>
      `;
    }).join('');
  };

  return `
    <div style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

      <!-- COVER PAGE SISWA -->
      <div style="text-align: center; margin-bottom: 30px; page-break-after: always; clear: both;">
        <div style="padding-top: 40px;">
          <h1 style="font-size: 16pt; margin: 0; font-weight: bold; font-family: 'Times New Roman';">LEMBAR AKTIVITAS & EVALUASI SISWA</h1>
          <h1 style="font-size: 16pt; margin: 5px 0 0 0; font-weight: bold; font-family: 'Times New Roman';">KURIKULUM MERDEKA</h1>
          <h2 style="font-size: 14pt; margin: 15px 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">${formState.mataPelajaran}</h2>
          <h2 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman';">KELAS ${formState.kelas} (FASE ${formState.fase})</h2>
        </div>
        
        <div style="margin: 50px auto; text-align: center;">
          ${logoBase64 ? `
            <img src="${logoBase64}" alt="Logo Sekolah" style="width: 140px; height: 140px; object-fit: contain;" />
          ` : `
            <div style="width: 140px; height: 140px; border: 4px double #000000; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; padding: 5px; box-sizing: border-box;">
              <div style="font-size: 11pt; font-weight: bold; color: #000000; text-align: center; font-family: 'Times New Roman'; line-height: 1.3;">
                LOGO<br/>
                SEKOLAH
              </div>
            </div>
          `}
        </div>

        <div style="margin: 50px 0; font-size: 12pt; font-family: 'Times New Roman';">
          <table style="margin: 0 auto; text-align: left; font-size: 11pt; font-family: 'Times New Roman'; border: none;">
            <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Materi Pokok</td><td style="padding: 5px; border: none;">: ${formState.topik}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Satuan Pendidikan</td><td style="padding: 5px; border: none;">: ${formState.satuanPendidikan}</td></tr>
            <tr style="border: none;"><td style="padding: 5px 15px; border: none; font-weight: bold;">Tahun Ajaran</td><td style="padding: 5px; border: none;">: ${formState.tahunAjaran}</td></tr>
          </table>
        </div>

        <div style="margin-top: 100px; padding-bottom: 40px; font-family: 'Times New Roman'; font-style: italic; color: #555555;">
          "Semangat Belajar! Lakukan yang Terbaik."
        </div>
      </div>

      <!-- PAGE BREAK -->
      <br style="page-break-before: always; clear: both;" />

      <!-- LKPD SHEET -->
      <div style="border: 2px dashed #000000; padding: 20px; margin-bottom: 25px; border-radius: 8px; page-break-inside: avoid; font-family: 'Times New Roman';">
        <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline;">LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
        
        <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
          <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Hari/Tanggal</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nama Kelompok</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
          <tr style="border: none;"><td style="border: none; padding: 2px;">Anggota</td><td style="border: none; padding: 2px;" colspan="3">: 1. ....................................  2. ....................................  3. ....................................</td></tr>
        </table>
        
        <div style="margin-bottom: 15px; font-size: 11pt; line-height: 1.5;">
          <strong>Aktivitas Tugas Kelompok:</strong>
          <div style="margin-top: 5px;">
            ${formatLkpdContent(data.lkpdTugas)}
          </div>
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
        <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline;">LEMBAR EVALUASI PENGETAHUAN</h3>
        
        <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
          <tr style="border: none;"><td style="border: none; padding: 2px; width: 15%;">Nama Siswa</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td><td style="border: none; padding: 2px; width: 15%;">Nilai Evaluasi</td><td style="border: none; padding: 2px; width: 35%;">: ...................................</td></tr>
          <tr style="border: none;"><td style="border: none; padding: 2px;">No. Absen</td><td style="border: none; padding: 2px;" colspan="3">: ...................................</td></tr>
        </table>

        <div style="font-size: 11pt; line-height: 1.5; margin-top: 10px;">
          <strong>Kerjakan soal-soal di bawah ini dengan tepat!</strong>
          <div style="margin-top: 10px;">
            ${formatEvaluasiContent(data.soalEvaluasi)}
          </div>
        </div>
      </div>

      <!-- SIGNATURE BLOCK -->
      <div style="margin-top: 40px; page-break-inside: avoid; font-family: 'Times New Roman'; font-size: 11pt;">
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

      const listItems = Array.from(doc.querySelectorAll('td')).filter(el => {
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
