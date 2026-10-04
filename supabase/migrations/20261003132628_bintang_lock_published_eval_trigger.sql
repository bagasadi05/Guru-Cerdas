-- =============================================================================
-- Migration: 20261003132628_bintang_lock_published_eval_trigger
-- Tanggal  : 2026-10-03
-- Tujuan   : Mengunci isi rapor BINTANG yang sudah dipublikasikan.
--
-- Masalah: PostgreSQL menggabungkan policy UPDATE permissive dengan OR secara
--   terpisah untuk USING dan WITH CHECK. Sejak policy "unpublish to draft"
--   (USING is_published = true) ditambahkan, baris terbit lolos USING lewat
--   policy itu dan lolos WITH CHECK lewat "publish draft" (is_published = true).
--   Akibatnya isi rapor terbit (nilai, catatan, evaluator) tetap bisa diubah,
--   termasuk lewat UPSERT "Generate" dari dashboard.
--
-- Solusi: RLS tidak bisa membandingkan OLD dan NEW, jadi penguncian dipindah ke
--   trigger BEFORE UPDATE. Pada baris yang sudah terbit, hanya kolom
--   is_published (dan updated_at) yang boleh berubah, sehingga alur
--   "Batal Publikasi" tetap jalan dan edit isi wajib lewat status Draft.
--
-- Sifat: IDEMPOTENT.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_published_bintang_eval_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.is_published
       AND (to_jsonb(NEW) - ARRAY['is_published', 'updated_at'])
           IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['is_published', 'updated_at'])
    THEN
        RAISE EXCEPTION 'Rapor BINTANG yang sudah dipublikasikan tidak dapat diubah. Batalkan publikasi terlebih dahulu.'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_published_bintang_eval ON public.bintang_monthly_evaluations;
CREATE TRIGGER trg_lock_published_bintang_eval
    BEFORE UPDATE ON public.bintang_monthly_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_published_bintang_eval_edit();
