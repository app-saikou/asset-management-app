-- ユーザー UID: b47e67e0-40d5-4945-a398-e9db617cc585 のデータ一覧取得

-- 1. 基本情報
SELECT 'User Profile' as table_name, 
       id::text, user_id::text, birth_date::text, created_at::text, updated_at::text,
       NULL::text as col6, NULL::text as col7, NULL::text as col8, NULL::text as col9, NULL::text as col10
FROM user_profiles 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

UNION ALL

-- 2. 計算年齢設定
SELECT 'Calculation Ages' as table_name,
       id::text, user_id::text, target_age::text, NULL::text as target_month, is_active::text, 
       display_order::text, created_at::text, updated_at::text, NULL::text as col9, NULL::text as col10
FROM user_calculation_ages 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

UNION ALL

-- 3. 資産データ
SELECT 'Assets' as table_name,
       id::text, user_id::text, type, name, amount::text, annual_rate::text, 
       memo, created_at::text, updated_at::text, NULL::text as col10
FROM multiple_assets 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

UNION ALL

-- 4. 資産履歴
SELECT 'Asset History' as table_name,
       id::text, user_id::text, current_assets::text, annual_rate::text, years::text, 
       future_value::text, increase_amount::text, created_at::text, NULL::text as col9, NULL::text as col10
FROM asset_history 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

UNION ALL

-- 5. 予算カテゴリ
SELECT 'Budget Categories' as table_name,
       id::text, user_id::text, type, name, amount::text, is_pro_only::text, 
       created_at::text, updated_at::text, NULL::text as col9, NULL::text as col10
FROM user_budget_categories 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

UNION ALL

-- 6. 予算期間設定
SELECT 'Budget Periods' as table_name,
       id::text, user_id::text, type, name, start_date::text, end_date::text, 
       monthly_amount::text, annual_rate::text, source_asset_id::text, target_asset_id::text
FROM user_budget_periods 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

UNION ALL

-- 7. 月次予測データ（最新5件）
SELECT 'Monthly Projections' as table_name,
       id::text, user_id::text, asset_id::text, month_year::text, balance::text, 
       contribution::text, rate::text, created_at::text, NULL::text as col9, NULL::text as col10
FROM (
  SELECT * FROM monthly_asset_projections 
  WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'
  ORDER BY month_year DESC, created_at DESC
  LIMIT 5
) latest_projections

UNION ALL

-- 8. 目標年齢スナップショット
SELECT 'Target Age Snapshots' as table_name,
       id::text, user_id::text, target_age::text, years_from_now::text, months_from_now::text, 
       total_balance::text, created_at::text, NULL::text as col8, NULL::text as col9, NULL::text as col10
FROM target_age_snapshots 
WHERE user_id = 'b47e67e0-40d5-4945-a398-e9db617cc585'

ORDER BY table_name, created_at;
