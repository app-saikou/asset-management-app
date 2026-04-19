-- user_calculation_agesテーブルにtarget_monthカラムが存在するか確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_calculation_ages'
  AND column_name = 'target_month';

-- 既存データのtarget_monthを確認（最初の5件）
SELECT id, user_id, target_age, target_month, target_amount, is_active
FROM user_calculation_ages
ORDER BY created_at DESC
LIMIT 5;

