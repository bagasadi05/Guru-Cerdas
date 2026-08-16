<!-- memory v2 -->
# Portal Guru — Memory

## Skill Utama (SELALU AKTIF)

Di awal **SETIAP tugas**, aktivasi skill `portal-guru` (via `activate_skill`). Ini playbook gabungan:
konvensi project + workflow universal (quality gates, security, docs, routing skill bawaan).
Jika tidak auto-load, muat manual sebelum menjawab/menulis kode.

## Startup Ritual

1. `/portal-guru` — muat playbook utama
2. Review perubahan: `rtk git diff --stat`
3. Quality gate: `rtk tsc` → `rtk lint` → `rtk npm test`
4. Update docs jika ada perubahan
5. Security scan dasar

(Pesan mendesak → jawab dulu, ritual sesudah. Skill error/skip → lanjut langkah berikutnya.)

## Pointer Cepat

- Arsitektur & konvensi → `references/project-guide.md` (dalam skill portal-guru)
- Perintah → `references/commands.md`
- Graphify → `references/graphify.md`
- CI/CD → `references/ci-cd.md`
- Pertanyaan produk Command Code → skill `command-code-knowledge`
- Ubah settings → `cmdc config set <key> <value> --scope user|project`

## Bahasa

Code & komentar dalam Bahasa Inggris. Dokumentasi & teks user-facing dalam Bahasa Indonesia.
