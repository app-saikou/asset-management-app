-- テーブル構造確認用SQL

-- 1. user_calculation_ages テーブルの構造確認
SELECT 'user_calculation_ages columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_calculation_ages' 
ORDER BY ordinal_position;

-- 2. 全テーブルの存在確認
SELECT 'Existing tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles',
  'user_calculation_ages', 
  'multiple_assets',
  'asset_history',
  'user_budget_categories',
  'user_budget_periods',
  'monthly_asset_projections',
  'target_age_snapshots'
)
ORDER BY table_name;

-- 3. ユーザーデータの件数確認
SELECT 'Data counts for user b47e67e0-40d5-4945-a398-e9db617cc585:' as info;
SELECT 
  'user_profiles' as table_name, COUNT(*) as count FROM user_profiles WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'user_calculation_ages', COUNT(*) FROM user_calculation_ages WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'multiple_assets', COUNT(*) FROM multiple_assets WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'asset_history', COUNT(*) FROM asset_history WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'user_budget_categories', COUNT(*) FROM user_budget_categories WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'user_budget_periods', COUNT(*) FROM user_budget_periods WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'monthly_asset_projections', COUNT(*) FROM monthly_asset_projections WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
UNION ALL
SELECT 'target_age_snapshots', COUNT(*) FROM target_age_snapshots WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';
