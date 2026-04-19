-- ユーザー UID: b47e67e0-40d5-4945-a398-e9db617cc585 の詳細データ取得

-- 1. ユーザープロフィール
SELECT '=== USER PROFILE ===' as section;
SELECT * FROM user_profiles WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 2. 計算年齢設定
SELECT '=== CALCULATION AGES ===' as section;
SELECT * FROM user_calculation_ages WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585' ORDER BY display_order;

-- 3. 資産データ
SELECT '=== ASSETS ===' as section;
SELECT * FROM multiple_assets WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585' ORDER BY created_at;

-- 4. 資産履歴
SELECT '=== ASSET HISTORY ===' as section;
SELECT * FROM asset_history WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585' ORDER BY created_at DESC;

-- 5. 資産履歴詳細
SELECT '=== ASSET HISTORY DETAILS ===' as section;
SELECT ahd.*, ah.created_at as history_created_at
FROM asset_history_details ahd
JOIN asset_history ah ON ahd.history_id = ah.id
WHERE ah.user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
ORDER BY ah.created_at DESC, ahd.created_at;

-- 6. 予算カテゴリ
SELECT '=== BUDGET CATEGORIES ===' as section;
SELECT * FROM user_budget_categories WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585' ORDER BY type, created_at;

-- 7. 予算期間設定
SELECT '=== BUDGET PERIODS ===' as section;
SELECT ubp.*, 
       ma_source.name as source_asset_name,
       ma_target.name as target_asset_name
FROM user_budget_periods ubp
LEFT JOIN multiple_assets ma_source ON ubp.source_asset_id = ma_source.id
LEFT JOIN multiple_assets ma_target ON ubp.target_asset_id = ma_target.id
WHERE ubp.user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
ORDER BY ubp.start_date, ubp.type;

-- 8. 月次予測データ（最新10件）
SELECT '=== MONTHLY PROJECTIONS (Latest 10) ===' as section;
SELECT map.*, ma.name as asset_name, ma.type as asset_type
FROM monthly_asset_projections map
JOIN multiple_assets ma ON map.asset_id = ma.id
WHERE map.user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
ORDER BY map.month_year DESC, map.created_at DESC
LIMIT 10;

-- 9. 目標年齢スナップショット
SELECT '=== TARGET AGE SNAPSHOTS ===' as section;
SELECT * FROM target_age_snapshots WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585' ORDER BY target_age;

-- 10. データ件数サマリー
SELECT '=== DATA SUMMARY ===' as section;
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
