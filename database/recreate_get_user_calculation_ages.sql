-- get_user_calculation_ages関数を再作成
-- target_monthとtarget_amountを含むように更新

DROP FUNCTION IF EXISTS get_user_calculation_ages(UUID);

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
    COALESCE(uca.target_month, 0)::INTEGER as target_month,
    uca.target_amount,
    uca.is_active,
    uca.display_order
  FROM user_calculation_ages uca
  WHERE uca.user_id = user_uuid AND uca.is_active = true
  ORDER BY uca.display_order ASC, uca.target_age ASC, COALESCE(uca.target_month, 0) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

