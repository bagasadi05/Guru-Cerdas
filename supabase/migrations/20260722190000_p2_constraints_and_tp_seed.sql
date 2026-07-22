-- 20260722190000_p2_constraints_and_tp_seed.sql
-- P2-1: Unique index dengan COALESCE(fase, '') agar NULL fase mencegah duplikat
-- P2-2: Seed minimal ref_bank_tp_iktp

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ref_boilerplate_topik 
ON public.ref_boilerplate_topik (mata_pelajaran, topik, COALESCE(fase, ''));

-- Seed minimal ref_bank_tp_iktp
INSERT INTO public.ref_bank_tp_iktp (id, cp_id, tujuan_pembelajaran, iktp, is_verified) VALUES
  ('tp-001', 'cp-mat-01', 'Peserta didik dapat memahami konsep penjumlahan bilangan cacah hingga 100.', '["Menyebutkan jumlah 2 kelompok benda","Menghitung hasil penjumlahan bersusun pendek"]'::jsonb, true),
  ('tp-002', 'cp-ipas-01', 'Peserta didik dapat mengidentifikasi proses fotosintesis pada tumbuhan.', '["Menjelaskan 4 bahan utama fotosintesis","Menyebutkan zat hasil fotosintesis"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
