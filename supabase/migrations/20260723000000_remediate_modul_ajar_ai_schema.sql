-- Migration: 20260723000000_remediate_modul_ajar_ai_schema.sql
-- FASE R1: Remediasi Schema Penyimpanan Modul Ajar AI

-- 1. Tambahkan kolom konten_json & ai_dynamic_content ke ref_boilerplate_topik jika belum ada
ALTER TABLE public.ref_boilerplate_topik
  ADD COLUMN IF NOT EXISTS konten_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_dynamic_content jsonb DEFAULT '{}'::jsonb;

-- 2. Berikan nilai default '' pada lkpd_tugas dan soal_evaluasi untuk mencegah Not Null Constraint Violation saat insert worker
ALTER TABLE public.ref_boilerplate_topik
  ALTER COLUMN lkpd_tugas SET DEFAULT '',
  ALTER COLUMN soal_evaluasi SET DEFAULT '';

-- 3. Perbaiki trigger sinkronisasi status agar status non-verified (rejected, deprecated, in_review, draft_ai) tidak berubah menjadi draft_manual
CREATE OR REPLACE FUNCTION public.sync_ref_boilerplate_topik_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.content_status IS DISTINCT FROM OLD.content_status THEN
    IF NEW.content_status = 'verified' THEN
      NEW.is_verified := true;
    ELSE
      NEW.is_verified := false;
    END IF;
  ELSIF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NEW.is_verified = true THEN
      NEW.content_status := 'verified';
    ELSIF OLD.content_status = 'verified' THEN
      NEW.content_status := 'draft_manual';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_ref_boilerplate_topik_status ON public.ref_boilerplate_topik;
CREATE TRIGGER trigger_sync_ref_boilerplate_topik_status
  BEFORE INSERT OR UPDATE ON public.ref_boilerplate_topik
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_ref_boilerplate_topik_status();
