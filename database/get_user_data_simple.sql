-- ユーザー UID: b47e67e0-40d5-4945-a398-e9db617cc585 のデータ一覧取得（シンプル版）

-- 1. ユーザープロフィール
SELECT '=== USER PROFILE ===' as section;
SELECT * FROM user_profiles WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 2. 計算年齢設定
SELECT '=== CALCULATION AGES ===' as section;
SELECT * FROM user_calculation_ages WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 3. 資産データ
SELECT '=== ASSETS ===' as section;
SELECT * FROM multiple_assets WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 4. 資産履歴
SELECT '=== ASSET HISTORY ===' as section;
SELECT * FROM asset_history WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 5. 予算カテゴリ
SELECT '=== BUDGET CATEGORIES ===' as section;
SELECT * FROM user_budget_categories WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 6. 予算期間設定
SELECT '=== BUDGET PERIODS ===' as section;
SELECT * FROM user_budget_periods WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 7. 月次予測データ（最新5件）
SELECT '=== MONTHLY PROJECTIONS (Latest 5) ===' as section;
SELECT * FROM monthly_asset_projections 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
ORDER BY month_year DESC, created_at DESC
LIMIT 5;

-- 8. 目標年齢スナップショット
SELECT '=== TARGET AGE SNAPSHOTS ===' as section;
SELECT * FROM target_age_snapshots WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585';

-- 9. データ件数サマリー
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
