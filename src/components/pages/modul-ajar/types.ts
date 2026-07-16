export type DocumentType = 'Modul Ajar' | 'RPP';
export type CurriculumApproach = 'Merdeka' | 'Berbasis Cinta' | 'Hybrid';

export interface FormState {
  generationMethod: 'AI' | 'Manual';
  documentType: DocumentType;
  curriculumApproach: CurriculumApproach;
  satuanPendidikan: string;
  jenjang: string;
  kelas: string;
  fase: string;
  mataPelajaran: string;
  topik: string;
  tahunAjaran: string;
  semester: string;
  guru: string;
  
  targetPeserta: string;
  kompetensiAwal: string;
  saranaPrasarana: string;
  capaianPembelajaran: string;
  profilPelajar: string[];
  
  jumlahPertemuan: number;
  jpPerPertemuan: number;
  durasiPerJp: number;
  
  modelPembelajaran: string;
  metodePembelajaran: string[];
  
  manualTujuanPembelajaran: string;
  manualPertanyaanPemantik: string;
  manualLkpdTugas: string;
  manualSoalEvaluasi: string;

  alokasiPendahuluan: number;
  alokasiInti: number;
  alokasiPenutup: number;
  rubrikAsesmen: RubrikRow[];
}

export interface RubrikRow {
  kriteria: string;
  sangatBaik: string;
  baik: string;
  cukup: string;
  perluBimbingan: string;
}
