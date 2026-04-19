-- Change user_budget_periods foreign keys from CASCADE to SET NULL
-- This preserves budget periods even when referenced assets are deleted
-- Also relax constraints to allow NULL asset references

-- 1) 既存の制約を削除
ALTER TABLE user_budget_periods
  DROP CONSTRAINT IF EXISTS chk_budget_periods_type_binding;

-- 2) 緩和された制約を追加（資産がNULLでも許可）
-- income: source_asset_idは常にNULL、target_asset_idはNULLでも許可（資産削除後も保持）
-- expense: target_asset_idは常にNULL、source_asset_idはNULLでも許可（資産削除後も保持）
-- investment: どちらかがNULLでも許可（資産削除後も保持）
ALTER TABLE user_budget_periods
  ADD CONSTRAINT chk_budget_periods_type_binding
  CHECK (
    (type = 'income' AND source_asset_id IS NULL)
    OR (type = 'expense' AND target_asset_id IS NULL)
    OR (type = 'investment' AND (source_asset_id IS NULL OR target_asset_id IS NULL OR source_asset_id <> target_asset_id))
  );

-- 3) source_asset_idの外部キー制約をSET NULLに変更
ALTER TABLE user_budget_periods
  DROP CONSTRAINT IF EXISTS user_budget_periods_source_asset_id_fkey;

ALTER TABLE user_budget_periods
  ADD CONSTRAINT user_budget_periods_source_asset_id_fkey
    FOREIGN KEY (source_asset_id)
    REFERENCES multiple_assets(id)
    ON DELETE SET NULL;

-- 4) target_asset_idの外部キー制約をSET NULLに変更
ALTER TABLE user_budget_periods
  DROP CONSTRAINT IF EXISTS user_budget_periods_target_asset_id_fkey;

ALTER TABLE user_budget_periods
  ADD CONSTRAINT user_budget_periods_target_asset_id_fkey
    FOREIGN KEY (target_asset_id)
    REFERENCES multiple_assets(id)
    ON DELETE SET NULL;

