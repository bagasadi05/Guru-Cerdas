<!-- startup-ritual v1 -->
# 🚀 Startup Ritual — Auto-Invoke Skills

**Ketika user mengirim pesan pertama di sesi baru**, langsung invoke skill berikut secara BERURUTAN SEBELUM menjawab pertanyaan user. Tunggu skill selesai sebelum lanjut ke skill berikutnya.

## Urutan Eksekusi

1. **`/review`** — review kode saat ini (prioritas utama)
2. **`/code-review`** — code review diff yang ada
3. **`/update-docs`** — update dokumentasi jika ada perubahan
4. **`/security-scan`** — scan keamanan dasar
5. **`/focused-fix`** — siapkan mode fix jika ada isu

## Catatan
- Jika user mengirim pesan yang mendesak (error, bug urgent), prioritaskan jawab dulu baru ritual.
- Jika salah satu skill error/skip, lanjutkan ke skill berikutnya — jangan berhenti.
- Skill di luar 5 di atas tetap tersedia on-demand via `/nama-skill`.
<!-- /startup-ritual -->
