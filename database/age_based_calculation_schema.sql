-- ユーザープロフィールテーブル（生年月日管理）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 年齢+月ベースの計算設定テーブル
CREATE TABLE IF NOT EXISTS user_calculation_ages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_age INTEGER NOT NULL CHECK (target_age > 0 AND target_age <= 120),
  target_month INTEGER NOT NULL CHECK (target_month >= 0 AND target_month <= 11),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_age, target_month)
);

-- インデックス
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_calculation_ages_user_id ON user_calculation_ages(user_id);
CREATE INDEX idx_user_calculation_ages_active ON user_calculation_ages(is_active);

-- RLS (Row Level Security) ポリシー
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calculation_ages ENABLE ROW LEVEL SECURITY;

-- ユーザープロフィールのポリシー
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 年齢計算設定のポリシー
CREATE POLICY "Users can view own calculation ages" ON user_calculation_ages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculation ages" ON user_calculation_ages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calculation ages" ON user_calculation_ages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calculation ages" ON user_calculation_ages
  FOR DELETE USING (auth.uid() = user_id);

-- ユーザーの現在年齢を計算する関数
CREATE OR REPLACE FUNCTION get_user_current_age(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  birth_date_val DATE;
  current_age INTEGER;
BEGIN
  SELECT birth_date INTO birth_date_val
  FROM user_profiles
  WHERE user_id = user_uuid;
  
  IF birth_date_val IS NULL THEN
    RETURN NULL;
  END IF;
  
  current_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date_val));
  RETURN current_age;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーの現在年齢+月を計算する関数
CREATE OR REPLACE FUNCTION get_user_current_age_month(user_uuid UUID)
RETURNS TABLE (
  age INTEGER,
  month INTEGER
) AS $$
DECLARE
  birth_date_val DATE;
  current_date_val DATE := CURRENT_DATE;
  age_years INTEGER;
  age_months INTEGER;
BEGIN
  SELECT birth_date INTO birth_date_val
  FROM user_profiles
  WHERE user_id = user_uuid;
  
  IF birth_date_val IS NULL THEN
    RETURN;
  END IF;
  
  -- 年齢を計算
  age_years := EXTRACT(YEAR FROM AGE(current_date_val, birth_date_val));
  
  -- 月数を計算
  age_months := EXTRACT(MONTH FROM AGE(current_date_val, birth_date_val));
  
  RETURN QUERY SELECT age_years, age_months;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーの年齢+月ベース計算設定を取得する関数
CREATE OR REPLACE FUNCTION get_user_calculation_ages(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  target_age INTEGER,
  target_month INTEGER,
  target_amount NUMERIC,
  is_active BOOLEAN,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uca.id,
    uca.target_age,
    uca.target_month,
    uca.target_amount,
    uca.is_active,
    uca.display_order
  FROM user_calculation_ages uca
  WHERE uca.user_id = user_uuid AND uca.is_active = true
  ORDER BY uca.display_order ASC, uca.target_age ASC, uca.target_month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 年齢ベース計算設定の数を取得する関数
CREATE OR REPLACE FUNCTION get_user_calculation_ages_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  custom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO custom_count
  FROM user_calculation_ages
  WHERE user_id = user_uuid AND is_active = true;

  RETURN custom_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 年齢ベース計算設定を追加できるかチェックする関数
CREATE OR REPLACE FUNCTION can_add_calculation_age(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT get_user_calculation_ages_count(user_uuid) INTO current_count;

  -- freeプランもproプランも1つまで
    max_count := 1;

  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 年齢ベース計算設定を安全に削除する関数（最低1つ制限付き）
CREATE OR REPLACE FUNCTION safe_remove_calculation_age(user_uuid UUID, age_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- 現在の年齢設定数を取得
  SELECT get_user_calculation_ages_count(user_uuid) INTO current_count;
  
  -- 最低1つ制限チェック
  IF current_count <= 1 THEN
    RETURN false;
  END IF;
  
  -- 年齢設定を削除
  UPDATE user_calculation_ages 
  SET is_active = false, updated_at = NOW()
  WHERE id = age_id AND user_id = user_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 年齢ベース計算設定を追加できるかチェックする関数（最低1つ制限考慮）
CREATE OR REPLACE FUNCTION can_add_calculation_age_with_minimum(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT get_user_calculation_ages_count(user_uuid) INTO current_count;

  -- freeプランもproプランも1つまで
    max_count := 1;

  -- 最低1つ制限を考慮
  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 年齢ベース計算設定の数を取得する関数（最低1つ制限考慮）
CREATE OR REPLACE FUNCTION get_user_calculation_ages_count_with_minimum(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  custom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO custom_count
  FROM user_calculation_ages
  WHERE user_id = user_uuid AND is_active = true;

  -- 最低1つ保証
  RETURN GREATEST(custom_count, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新規ユーザー登録時にデフォルト年齢+月設定を追加する関数
CREATE OR REPLACE FUNCTION handle_new_user_calculation_ages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_calculation_ages (user_id, target_age, target_month, is_active, display_order)
  VALUES (NEW.id, 65, 0, true, 1); -- デフォルトで65歳0ヶ月を設定
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成
CREATE TRIGGER on_auth_user_created_add_ages
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_calculation_ages();
