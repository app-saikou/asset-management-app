-- ユーザー資産テーブルの作成
CREATE TABLE user_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_assets BIGINT NOT NULL CHECK (current_assets >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX idx_user_assets_user_id ON user_assets(user_id);
CREATE INDEX idx_user_assets_updated_at ON user_assets(updated_at);

-- RLS (Row Level Security) の有効化
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Users can view their own assets" ON user_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets" ON user_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" ON user_assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" ON user_assets
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_assets_updated_at 
  BEFORE UPDATE ON user_assets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
