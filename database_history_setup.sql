-- 投影ラン（projection_runs）テーブル
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

ALTER PUBLICATION supabase_realtime ADD TABLE projection_runs;

-- 履歴保存機能用のテーブル作成
CREATE TABLE asset_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_assets NUMERIC NOT NULL,
  annual_rate NUMERIC NOT NULL,
  years INTEGER NOT NULL,
  future_value NUMERIC NOT NULL,
  increase_amount NUMERIC NOT NULL,
  projection_run_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) を有効化
ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の履歴のみ閲覧可能
CREATE POLICY "Users can view their own history." ON asset_history
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の履歴のみ作成可能
CREATE POLICY "Users can create their own history." ON asset_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の履歴のみ更新可能
CREATE POLICY "Users can update their own history." ON asset_history
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の履歴のみ削除可能
CREATE POLICY "Users can delete their own history." ON asset_history
  FOR DELETE USING (auth.uid() = user_id);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_asset_history_user_created 
ON asset_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_history_projection_run
ON asset_history(projection_run_id);

-- Realtime更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE asset_history;

-- updated_at自動更新用の関数とトリガー
CREATE TRIGGER update_asset_history_updated_at
BEFORE UPDATE ON asset_history
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
