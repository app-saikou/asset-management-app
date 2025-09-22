-- 複数資産管理用のテーブルを作成
CREATE TABLE multiple_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cash', 'stock')),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  annual_rate NUMERIC NOT NULL DEFAULT 0 CHECK (annual_rate >= 0),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) を有効化
ALTER TABLE multiple_assets ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分の資産のみ閲覧可能
CREATE POLICY "Users can view their own multiple assets." ON multiple_assets
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーが自分の資産のみ挿入可能
CREATE POLICY "Users can insert their own multiple assets." ON multiple_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分の資産のみ更新可能
CREATE POLICY "Users can update their own multiple assets." ON multiple_assets
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーが自分の資産のみ削除可能
CREATE POLICY "Users can delete their own multiple assets." ON multiple_assets
  FOR DELETE USING (auth.uid() = user_id);

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX idx_multiple_assets_user_type 
ON multiple_assets(user_id, type);

CREATE INDEX idx_multiple_assets_user_updated 
ON multiple_assets(user_id, updated_at DESC);

-- Realtime更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE multiple_assets;

-- updated_at カラムを自動更新する関数（既存の場合は再利用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at を自動更新するトリガーを作成
CREATE TRIGGER update_multiple_assets_updated_at
BEFORE UPDATE ON multiple_assets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ（テスト用 - 実際の運用では不要）
-- INSERT INTO multiple_assets (user_id, type, name, amount, annual_rate, memo) VALUES
-- (auth.uid(), 'cash', 'みずほ銀行 普通預金', 3000000, 0.001, '給与振込口座'),
-- (auth.uid(), 'cash', '手持ち現金', 500000, 0, '生活費用'),
-- (auth.uid(), 'stock', 'トヨタ自動車 (7203)', 2500000, 3.5, '配当狙いの長期投資'),
-- (auth.uid(), 'stock', 'S&P500 ETF', 1500000, 7, '米国株式市場への投資');
