-- 年数設定管理用テーブル設計

-- ユーザーの計算年数設定
CREATE TABLE user_calculation_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_number INTEGER NOT NULL, -- 年数（5年、10年、15年など）
  is_active BOOLEAN DEFAULT true, -- アクティブな設定かどうか
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year_number)
);

-- デフォルト年数設定（全ユーザー共通）
INSERT INTO user_calculation_years (user_id, year_number, is_active, display_order) VALUES
  (NULL, 10, true, 1); -- デフォルト10年

-- インデックス
CREATE INDEX idx_user_calculation_years_user_id ON user_calculation_years(user_id);
CREATE INDEX idx_user_calculation_years_active ON user_calculation_years(is_active);

-- RLS (Row Level Security) ポリシー
ALTER TABLE user_calculation_years ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の年数設定のみアクセス可能
CREATE POLICY "Users can view own calculation years" ON user_calculation_years
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own calculation years" ON user_calculation_years
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calculation years" ON user_calculation_years
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculation years" ON user_calculation_years
  FOR DELETE USING (auth.uid() = user_id);

-- 関数: ユーザーの年数設定を取得
CREATE OR REPLACE FUNCTION get_user_calculation_years(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  year_number INTEGER,
  is_active BOOLEAN,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ucy.id,
    ucy.year_number,
    ucy.is_active,
    ucy.display_order
  FROM user_calculation_years ucy
  WHERE (ucy.user_id = user_uuid OR ucy.user_id IS NULL)
  AND ucy.is_active = true
  ORDER BY ucy.display_order ASC, ucy.year_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: ユーザーの年数設定数を取得
CREATE OR REPLACE FUNCTION get_user_calculation_years_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_plan VARCHAR(20);
  custom_count INTEGER;
BEGIN
  -- ユーザーのプランタイプを取得
  SELECT plan_type INTO user_plan
  FROM get_user_subscription_status(user_uuid)
  LIMIT 1;
  
  -- ユーザーのカスタム年数設定数を取得
  SELECT COUNT(*) INTO custom_count
  FROM user_calculation_years
  WHERE user_id = user_uuid AND is_active = true;
  
  -- デフォルト年数（1件）を追加
  RETURN custom_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: 年数設定の制限チェック
CREATE OR REPLACE FUNCTION can_add_calculation_year(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan VARCHAR(20);
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  -- ユーザーのプランタイプを取得
  SELECT plan_type INTO user_plan
  FROM get_user_subscription_status(user_uuid)
  LIMIT 1;
  
  -- 現在の年数設定数を取得
  SELECT get_user_calculation_years_count(user_uuid) INTO current_count;
  
  -- プランに応じた最大数を設定
  IF user_plan = 'pro' THEN
    max_count := 3;
  ELSE
    max_count := 1;
  END IF;
  
  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
