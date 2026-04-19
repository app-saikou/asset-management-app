-- 年数設定の最低1つ制限を追加

-- 1. 年数設定を削除する前に最低1つ残るかチェックする関数
CREATE OR REPLACE FUNCTION can_remove_calculation_year(
  user_uuid UUID,
  year_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- ユーザーのアクティブな年数設定数を取得
  SELECT COUNT(*) INTO active_count
  FROM user_calculation_years
  WHERE user_id = user_uuid 
  AND is_active = true
  AND id != year_id; -- 削除対象を除く
  
  -- 最低1つは残る必要がある
  RETURN active_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 年数設定削除の制限チェック付き関数
CREATE OR REPLACE FUNCTION safe_remove_calculation_year(
  user_uuid UUID,
  year_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  can_remove BOOLEAN;
BEGIN
  -- 削除可能かチェック
  SELECT can_remove_calculation_year(user_uuid, year_id) INTO can_remove;
  
  IF NOT can_remove THEN
    RAISE EXCEPTION '年数設定は最低1つ必要です。最後の年数設定は削除できません。';
  END IF;
  
  -- 削除実行
  DELETE FROM user_calculation_years
  WHERE id = year_id 
  AND user_id = user_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 年数設定数を取得する関数（最低1つ制限考慮）
CREATE OR REPLACE FUNCTION get_user_calculation_years_count_with_minimum(
  user_uuid UUID
)
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
  
  -- 最低1つは保証
  RETURN GREATEST(custom_count, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 年数追加の制限チェック関数（最低1つ制限考慮）
CREATE OR REPLACE FUNCTION can_add_calculation_year_with_minimum(
  user_uuid UUID
)
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
  SELECT get_user_calculation_years_count_with_minimum(user_uuid) INTO current_count;
  
  -- プランに応じた最大数を設定
  IF user_plan = 'pro' THEN
    max_count := 3;
  ELSE
    max_count := 1;
  END IF;
  
  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
