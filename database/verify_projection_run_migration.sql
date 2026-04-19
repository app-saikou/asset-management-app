-- 移行後の検証クエリ
-- 既存データの状態を確認

-- 1. スキーマが正しく変更されたか確認
-- ユニーク制約が正しく変更されているか確認
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'monthly_asset_projections'::regclass
  AND contype = 'u'
ORDER BY conname;

-- 2. projection_run_idの分布を確認
-- 各projection_run_idに紐づくレコード数を確認
SELECT 
  projection_run_id,
  count(*) as row_count,
  min(month_year) as first_month,
  max(month_year) as last_month,
  count(distinct asset_id) as asset_count
FROM monthly_asset_projections
GROUP BY projection_run_id
ORDER BY first_month;

-- 3. 重複がないか確認（これが1になるべき）
-- 同じ(user_id, asset_id, month_year)の組み合わせに対して複数のprojection_run_idが存在しないか
SELECT 
  user_id, 
  asset_id, 
  month_year, 
  count(*) as dup_count,
  array_agg(DISTINCT projection_run_id) as projection_run_ids
FROM monthly_asset_projections
GROUP BY user_id, asset_id, month_year
HAVING count(*) > 1
ORDER BY dup_count DESC
LIMIT 20;

-- 4. asset_historyとprojection_run_idの紐付け状況を確認
SELECT 
  ah.id as history_id,
  ah.created_at as history_created_at,
  ah.projection_run_id,
  count(map.*) as projections_count
FROM asset_history ah
LEFT JOIN monthly_asset_projections map 
  ON map.projection_run_id = ah.projection_run_id
GROUP BY ah.id, ah.created_at, ah.projection_run_id
ORDER BY ah.created_at DESC
LIMIT 20;

-- 5. projection_run_idがNULLのレコードがないか確認（これが0になるべき）
SELECT count(*) as null_projection_run_id_count
FROM monthly_asset_projections
WHERE projection_run_id IS NULL;

