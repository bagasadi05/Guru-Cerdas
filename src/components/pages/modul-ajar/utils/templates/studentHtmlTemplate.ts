import type { FormState } from '../../types';
import {
  listToHtml,
  formatLkpdContent,
  formatEvaluasiContent,
  formatMateriContent,
} from './templateFormatters';

export const buildStudentHtmlTemplate = (formState: FormState, data: any, logoBase64: string): string => {
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
            <tr style="border: none;"><td style="width: 36%; padding: 5px 10px; border: none; font-weight: bold;">Materi Pokok</td><td style="width: 64%; padding: 5px; border: none;">: ${formState.topik}</td></tr>
            <tr style="border: none;"><td style="width: 36%; padding: 5px 10px; border: none; font-weight: bold;">Satuan Pendidikan</td><td style="width: 64%; padding: 5px; border: none;">: ${formState.satuanPendidikan}</td></tr>
            <tr style="border: none;"><td style="width: 36%; padding: 5px 10px; border: none; font-weight: bold;">Tahun Ajaran</td><td style="width: 64%; padding: 5px; border: none;">: ${formState.tahunAjaran}</td></tr>
          </table>
        </div>

        <div style="margin-top: 60px; padding-bottom: 20px; font-family: 'Times New Roman'; font-style: italic; color: #555555;">
          "Semangat Belajar! Lakukan yang Terbaik."
        </div>
      </div>

      ${data.materiAjar ? `
      <!-- BAHAN BACAAN SISWA -->
      <div style="border: 2px solid #0d6b3e; padding: 20px; margin-bottom: 25px; border-radius: 8px; font-family: 'Times New Roman'; page-break-inside: avoid;">
        <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; color: #0d6b3e;">
          RINGKASAN BAHAN BACAAN SISWA
        </h3>
        <div style="font-size: 10.5pt; line-height: 1.5; text-align: justify;">
          ${formatMateriContent(data.materiAjar)}
        </div>
      </div>
      <br style="page-break-before: always; clear: both;" />
      ` : ''}

      <!-- LKPD SHEET -->
      <div style="border: 2px dashed #000000; padding: 20px; margin-bottom: 25px; border-radius: 8px; page-break-inside: avoid; font-family: 'Times New Roman';">
        <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
          LEMBAR KERJA PESERTA DIDIK (LKPD)
        </h3>
        
        <table style="width: 100%; border: none; margin-bottom: 15px; font-size: 10pt; font-family: 'Times New Roman';">
          <tr style="border: none;"><td style="border: none; padding: 2px; width: 18%;">Hari/Tanggal</td><td style="border: none; padding: 2px; width: 32%;">: ...................................</td><td style="border: none; padding: 2px; width: 18%;">Nama Kelompok</td><td style="border: none; padding: 2px; width: 32%;">: ...................................</td></tr>
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
      <div class="signature-block" style="margin-top: 20px; page-break-inside: avoid; break-inside: avoid; font-family: 'Times New Roman'; font-size: 10pt;">
        <table class="signature-block" style="width: 100%; border: none; page-break-inside: avoid; break-inside: avoid;">
          <tr style="border: none; page-break-inside: avoid; break-inside: avoid;">
            <td style="width: 50%; text-align: center; border: none; vertical-align: top; padding: 6px 10px;">
              Mengetahui,<br/>
              Kepala ${formState.satuanPendidikan}<br/><br/><br/>
              <strong><u>.......................................................</u></strong><br/>
              NIP. ...................................................
            </td>
            <td style="width: 50%; text-align: center; border: none; vertical-align: top; padding: 6px 10px;">
              Guru Mata Pelajaran,<br/><br/><br/>
              <strong><u>${formState.guru || '...................................................'}</u></strong><br/>
              NIP. ...................................................
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 18px; font-size: 9.5pt; line-height: 1.35; font-family: 'Times New Roman'; text-align: left; page-break-inside: avoid; break-inside: avoid;">
        <strong>Daftar Pustaka & Referensi Belajar:</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 20px;">
          ${listToHtml(data.daftarPustaka)}
        </ul>
      </div>

    </div>
  `;
};
