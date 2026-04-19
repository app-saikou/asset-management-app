-- This file contains all the necessary SQL to set up the budget and projection features

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 0) Projection runs (calculation execution logs)
create table if not exists public.projection_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  history_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_projection_runs_user on public.projection_runs(user_id);
create index if not exists idx_projection_runs_history on public.projection_runs(history_id);

-- 1) Budget categories (simple buckets user can name)
create table if not exists public.user_budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  name text not null,
  amount numeric(15,2) not null default 0,
  is_pro_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Period settings (income/expense/investment periods)
create table if not exists public.user_budget_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','investment')),
  name text not null,
  start_date date not null,
  end_date date not null,
  monthly_amount numeric(15,2) not null default 0,
  annual_rate numeric(7,4) not null default 0,
  is_pro_only boolean not null default false,
  source_asset_id uuid references public.multiple_assets(id) on delete cascade,
  target_asset_id uuid references public.multiple_assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- Type-specific binding constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_budget_periods_type_binding') then
    alter table public.user_budget_periods
      add constraint chk_budget_periods_type_binding
      check (
        (type = 'income'     and target_asset_id is not null and source_asset_id is null)
     or (type = 'expense'    and source_asset_id is not null and target_asset_id is null)
     or (type = 'investment' and source_asset_id is not null and target_asset_id is not null and source_asset_id <> target_asset_id)
      );
  end if;
end $$;

-- Performance indexes for asset references
create index if not exists idx_budget_periods_source on public.user_budget_periods(source_asset_id);
create index if not exists idx_budget_periods_target on public.user_budget_periods(target_asset_id);

-- 3) Monthly projections (per asset per month)
create table if not exists public.monthly_asset_projections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.multiple_assets(id) on delete cascade,
  projection_run_id uuid not null,
  month_year date not null,
  balance numeric(18,2) not null default 0,
  contribution numeric(15,2) not null default 0,
  rate numeric(7,4) not null default 0,
  created_at timestamptz not null default now(),
  unique(projection_run_id, asset_id, month_year)
);

create index if not exists idx_monthly_asset_projections_user_run
  on public.monthly_asset_projections(user_id, projection_run_id);

-- 4) Target-age snapshots (balances at target points)
create table if not exists public.target_age_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_age integer not null,
  years_from_now integer not null,
  months_from_now integer not null,
  total_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, target_age)
);

-- Optional helper: last updated trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_budget_categories_updated_at'
  ) then
    create trigger trg_budget_categories_updated_at
    before update on public.user_budget_categories
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_budget_periods_updated_at'
  ) then
    create trigger trg_budget_periods_updated_at
    before update on public.user_budget_periods
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- RLS policies
alter table public.projection_runs enable row level security;
alter table public.user_budget_categories enable row level security;
alter table public.user_budget_periods enable row level security;
alter table public.monthly_asset_projections enable row level security;
alter table public.target_age_snapshots enable row level security;

-- Policies: users can manage only their own rows
-- Drop existing policies if they exist
drop policy if exists "projection_runs_select" on public.projection_runs;
drop policy if exists "projection_runs_modify" on public.projection_runs;
drop policy if exists "budget_categories_select" on public.user_budget_categories;
drop policy if exists "budget_categories_modify" on public.user_budget_categories;
drop policy if exists "budget_periods_select" on public.user_budget_periods;
drop policy if exists "budget_periods_modify" on public.user_budget_periods;
drop policy if exists "monthly_projections_select" on public.monthly_asset_projections;
drop policy if exists "monthly_projections_modify" on public.monthly_asset_projections;
drop policy if exists "target_snapshots_select" on public.target_age_snapshots;
drop policy if exists "target_snapshots_modify" on public.target_age_snapshots;

-- Create policies
create policy "projection_runs_select"
on public.projection_runs for select
using (auth.uid() = user_id);

create policy "projection_runs_modify"
on public.projection_runs for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budget_categories_select"
on public.user_budget_categories for select
using (auth.uid() = user_id);

create policy "budget_categories_modify"
on public.user_budget_categories for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budget_periods_select"
on public.user_budget_periods for select
using (auth.uid() = user_id);

create policy "budget_periods_modify"
on public.user_budget_periods for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "monthly_projections_select"
on public.monthly_asset_projections for select
using (auth.uid() = user_id);

create policy "monthly_projections_modify"
on public.monthly_asset_projections for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "target_snapshots_select"
on public.target_age_snapshots for select
using (auth.uid() = user_id);

create policy "target_snapshots_modify"
on public.target_age_snapshots for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);
