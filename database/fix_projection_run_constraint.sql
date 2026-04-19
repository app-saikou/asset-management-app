-- Align monthly_asset_projections with projection_run granularity
-- Safe to re-run; uses IF NOT EXISTS guards throughout

-- Ensure projection_runs metadata table exists
create table if not exists public.projection_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  history_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_projection_runs_user on public.projection_runs(user_id);
create index if not exists idx_projection_runs_history on public.projection_runs(history_id);

alter table public.projection_runs enable row level security;

drop policy if exists "projection_runs_select" on public.projection_runs;
create policy "projection_runs_select"
on public.projection_runs for select
using (auth.uid() = user_id);

drop policy if exists "projection_runs_modify" on public.projection_runs;
create policy "projection_runs_modify"
on public.projection_runs for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Monthly projections now key off projection_run_id
alter table public.monthly_asset_projections
  add column if not exists projection_run_id uuid;

update public.monthly_asset_projections
set projection_run_id = gen_random_uuid()
where projection_run_id is null;

alter table public.monthly_asset_projections
  alter column projection_run_id set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'monthly_asset_projections_user_id_asset_id_month_year_key'
  ) then
    alter table public.monthly_asset_projections
      drop constraint monthly_asset_projections_user_id_asset_id_month_year_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_asset_projections_projection_run_id_asset_id_month_year_key'
  ) then
    alter table public.monthly_asset_projections
      add constraint monthly_asset_projections_projection_run_id_asset_id_month_year_key
      unique (projection_run_id, asset_id, month_year);
  end if;
end $$;

create index if not exists idx_monthly_asset_projections_user_run
  on public.monthly_asset_projections(user_id, projection_run_id);

-- Asset history keeps a back-reference to the projection run
alter table public.asset_history
  add column if not exists projection_run_id uuid;

create index if not exists idx_asset_history_projection_run
  on public.asset_history(projection_run_id);

