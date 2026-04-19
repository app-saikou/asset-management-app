-- ユーザーごとの年数設定に移行するマイグレーション

-- 1. 既存のデフォルト年数設定を削除
DELETE FROM user_calculation_years WHERE user_id IS NULL;

-- 2. 全ユーザーにデフォルト年数設定を追加
INSERT INTO user_calculation_years (user_id, year_number, is_active, display_order)
SELECT 
  u.id as user_id,
  10 as year_number,
  true as is_active,
  1 as display_order
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_calculation_years ucy 
  WHERE ucy.user_id = u.id
);

-- 3. テーブル定義を更新（user_idをNOT NULLに）
ALTER TABLE user_calculation_years 
ALTER COLUMN user_id SET NOT NULL;

-- 4. UNIQUE制約を更新（user_id, year_numberの組み合わせ）
ALTER TABLE user_calculation_years 
DROP CONSTRAINT IF EXISTS user_calculation_years_user_id_year_number_key;

ALTER TABLE user_calculation_years 
ADD CONSTRAINT user_calculation_years_user_id_year_number_key 
UNIQUE (user_id, year_number);

-- 5. 関数を更新
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
  WHERE ucy.user_id = user_uuid
  AND ucy.is_active = true
  ORDER BY ucy.display_order ASC, ucy.year_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 新規ユーザー登録時にデフォルト年数設定を作成する関数を更新
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーにデフォルトの無料プランを割り当て
  INSERT INTO public.user_subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  -- 新規ユーザーにデフォルト年数設定を追加
  INSERT INTO public.user_calculation_years (user_id, year_number, is_active, display_order)
  VALUES (NEW.id, 10, true, 1);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもユーザー作成は続行
    RAISE WARNING 'Failed to create subscription and years for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
