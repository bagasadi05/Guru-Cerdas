-- Migration: Create Perangkat Ajar Tables (Kaldik, Prota, Promes)
-- Milestone M5: Supabase persistence models with user-scoped RLS and cascade deletions

-- 1. kaldik_entries
CREATE TABLE IF NOT EXISTS public.kaldik_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  academic_year TEXT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 5),
  week_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_kaldik_week UNIQUE (user_id, academic_year, month, week_number)
);

-- 2. prota_headers
CREATE TABLE IF NOT EXISTS public.prota_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  academic_year TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  phase TEXT,
  curriculum TEXT NOT NULL DEFAULT 'MERDEKA',
  weekly_jp_quota INT NOT NULL DEFAULT 4,
  reserve_jp_sem1 INT NOT NULL DEFAULT 0,
  reserve_jp_sem2 INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. prota_items
CREATE TABLE IF NOT EXISTS public.prota_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prota_id UUID REFERENCES public.prota_headers(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  semester_number INT NOT NULL CHECK (semester_number IN (1, 2)),
  element_or_domain TEXT NOT NULL DEFAULT '',
  learning_objective_code TEXT NOT NULL DEFAULT '',
  learning_objective_text TEXT NOT NULL DEFAULT '',
  core_topic TEXT NOT NULL DEFAULT '',
  target_jp INT NOT NULL DEFAULT 0,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. promes_headers
CREATE TABLE IF NOT EXISTS public.promes_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prota_id UUID REFERENCES public.prota_headers(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  semester_number INT NOT NULL CHECK (semester_number IN (1, 2)),
  weekly_jp_limit INT NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_promes_semester UNIQUE (prota_id, semester_number)
);

-- 5. promes_week_allocations
CREATE TABLE IF NOT EXISTS public.promes_week_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promes_id UUID REFERENCES public.promes_headers(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  prota_item_id UUID REFERENCES public.prota_items(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  month_index INT NOT NULL CHECK (month_index BETWEEN 0 AND 5),
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 5),
  allocated_jp INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT uq_promes_allocation UNIQUE (promes_id, prota_item_id, month_index, week_number)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_kaldik_lookup ON public.kaldik_entries(user_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_prota_headers_user ON public.prota_headers(user_id);
CREATE INDEX IF NOT EXISTS idx_prota_items_prota ON public.prota_items(prota_id, semester_number, order_index);
CREATE INDEX IF NOT EXISTS idx_promes_headers_prota ON public.promes_headers(prota_id);
CREATE INDEX IF NOT EXISTS idx_promes_alloc_promes ON public.promes_week_allocations(promes_id);

-- Enable RLS
ALTER TABLE public.kaldik_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prota_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prota_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promes_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promes_week_allocations ENABLE ROW LEVEL SECURITY;

-- User Policies
CREATE POLICY "Users can manage their own kaldik entries"
  ON public.kaldik_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own prota headers"
  ON public.prota_headers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage prota items of their prota"
  ON public.prota_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.prota_headers ph
    WHERE ph.id = prota_items.prota_id AND ph.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prota_headers ph
    WHERE ph.id = prota_items.prota_id AND ph.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own promes headers"
  ON public.promes_headers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage allocations of their promes"
  ON public.promes_week_allocations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.promes_headers pm
    WHERE pm.id = promes_week_allocations.promes_id AND pm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.promes_headers pm
    WHERE pm.id = promes_week_allocations.promes_id AND pm.user_id = auth.uid()
  ));
