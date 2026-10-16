# Penyusunan Modul Ajar dengan AI

## Perilaku generator

- Modul penuh menggunakan sintaks model yang dipilih guru dari katalog; setiap pertemuan memiliki seluruh langkah dan jumlah menit inti sesuai pengaturan waktu.
- Materi ajar dan glosarium wajib tersedia. Tujuan dihubungkan dengan kegiatan inti, aktivitas LKPD, dan evaluasi melalui ID tujuan.
- Evaluasi terstruktur berisi tiga pilihan ganda A-D dan dua uraian. Nomor, pilihan berbeda, cakupan tujuan, jawaban, pembahasan, dan rubrik diperiksa sebelum dokumen diterima.
- Permintaan baru melewati validasi kontrak Zod dan pemeriksaan isi tambahan oleh AI. Jika gagal, maksimal satu patch terarah memperbaiki komponen, soal, atau pertemuan yang dilaporkan. Konten guru dan bagian lain dilindungi; dokumen gabungan diperiksa kembali. Hasil yang tetap gagal tidak diterima.
- Cache bank dengan kecocokan topik saja tidak digunakan untuk melewati pemeriksaan konteks guru pada permintaan baru.
- Tujuan dan soal yang sudah dimiliki guru harus dipertahankan. Materi dan LKPD milik guru turut dikirim dalam pemeriksaan keselarasan.

## CP dan referensi

CP memakai input guru, atau seluruh elemen dari bank `ref_capaian_pembelajaran` untuk mapel/fase yang cocok, berstatus `is_verified = true` dan memiliki `sumber_regulasi`. Tanpa CP tersebut, guru diminta mengisi CP dari dokumen sumber sekolah. AI tidak digunakan untuk mengarang CP resmi.

Tombol CP membaca bank yang sama. Tombol daftar pustaka mempertahankan sumber yang diberikan guru; bila kosong, tombol mengambil judul sumber CP dari bank. Penulis, tahun, penerbit, dan URL tidak ditambahkan dari ingatan model. Jalur manual tidak lagi memasukkan judul buku generik sebagai referensi otomatis.

Status terverifikasi mengikuti peninjauan data bank, bukan verifikasi daring terhadap regulasi terbaru. CP dari guru dan referensi masukan tetap membutuhkan pemeriksaan guru.

## Penyimpanan dan peninjauan

Dokumen menyimpan penanda pemeriksaan AI, asal CP, peringatan, evaluasi terstruktur, pemetaan aktivitas LKPD, serta kunci jawaban. Soal hasil tombol per kolom membawa kuncinya sampai penyimpanan; perubahan soal membatalkan kunci terkait agar jawaban lama tidak terbawa ke soal baru.

Pemeriksaan AI membantu menemukan kesalahan, tetapi tidak menjamin kebenaran pedagogis. Guru tetap meninjau ketepatan materi, stimulus, pilihan jawaban, rubrik, dan kesesuaian dengan kelas sebelum memakai atau membagikan modul.

Tombol **Susun dokumen** menggunakan cache pribadi guru yang konteks dan versi kontraknya cocok; hasil tersebut membutuhkan **0 panggilan AI baru**. Dokumen baru biasanya membutuhkan dua panggilan (penyusunan komponen kosong dan peninjauan), maksimal empat bila perlu satu patch dan peninjauan ulang. Jumlah percobaan HTTP bisa lebih besar saat provider mengalami pembatasan kuota. **Buat versi AI baru** melewati cache. Tombol per bidang mengikuti pilihan yang sama dan menyimpan LKPD/asesmen beserta pemetaan tujuan serta kuncinya.

Provider utama adalah Gemini sesuai `VITE_GEMINI_MODEL` (default `gemini-2.5-flash`); fallback khusus Modul Ajar adalah Groq `openai/gpt-oss-20b` bila dikonfigurasi. Cache private Supabase berlaku 7 hari; asal isian dipertahankan saat draft dipulihkan. Pembatalan menghentikan request dan tahap berikutnya, tetapi token yang telah dikonsumsi provider tidak dapat ditarik kembali.

Ringkasan pemakaian menampilkan panggilan, model aktual, dan token yang dilaporkan provider. Angka yang tidak dilaporkan tetap `null`; batas output bukan perkiraan pemakaian nyata. [Rincian cache, batas output, migrasi, dan bukti pemeriksaan](./modul-ajar-ai-hemat-kuota.md).
