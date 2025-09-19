-- 履歴保存機能用のテーブル作成
CREATE TABLE asset_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_assets NUMERIC NOT NULL,
  annual_rate NUMERIC NOT NULL,
  years INTEGER NOT NULL,
  future_value NUMERIC NOT NULL,
  increase_amount NUMERIC NOT NULL,
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

-- Realtime更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE asset_history;

-- updated_at自動更新用の関数とトリガー
CREATE TRIGGER update_asset_history_updated_at
BEFORE UPDATE ON asset_history
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
