-- Migration: Ensure updated_at trigger exists on bintang_monthly_evaluations
CREATE OR REPLACE FUNCTION public.update_bintang_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bintang_monthly_evaluations_updated_at ON public.bintang_monthly_evaluations;

CREATE TRIGGER update_bintang_monthly_evaluations_updated_at
    BEFORE UPDATE ON public.bintang_monthly_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bintang_updated_at_column();
