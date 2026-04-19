-- Fix RLS policies for budget tables
-- Drop existing policies first, then recreate them

-- Drop existing policies
DROP POLICY IF EXISTS "budget_categories_select" ON public.user_budget_categories;
DROP POLICY IF EXISTS "budget_categories_modify" ON public.user_budget_categories;
DROP POLICY IF EXISTS "budget_periods_select" ON public.user_budget_periods;
DROP POLICY IF EXISTS "budget_periods_modify" ON public.user_budget_periods;
DROP POLICY IF EXISTS "monthly_projections_select" ON public.monthly_asset_projections;
DROP POLICY IF EXISTS "monthly_projections_modify" ON public.monthly_asset_projections;
DROP POLICY IF EXISTS "target_snapshots_select" ON public.target_age_snapshots;
DROP POLICY IF EXISTS "target_snapshots_modify" ON public.target_age_snapshots;

-- Recreate policies
CREATE POLICY "budget_categories_select"
ON public.user_budget_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "budget_categories_modify"
ON public.user_budget_categories FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_periods_select"
ON public.user_budget_periods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "budget_periods_modify"
ON public.user_budget_periods FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "monthly_projections_select"
ON public.monthly_asset_projections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "monthly_projections_modify"
ON public.monthly_asset_projections FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "target_snapshots_select"
ON public.target_age_snapshots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "target_snapshots_modify"
ON public.target_age_snapshots FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
