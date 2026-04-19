-- Add asset_type column to monthly_asset_projections to preserve asset type
-- even if the original asset record is deleted.

-- 1) Column追加
ALTER TABLE monthly_asset_projections
  ADD COLUMN IF NOT EXISTS asset_type TEXT CHECK (asset_type IN ('cash', 'stock'));

-- 2) パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_monthly_asset_projections_asset_type
  ON monthly_asset_projections(asset_type);

-- 3) 既存レコードの補完
-- multiple_assets にまだ残っているものはそこから補完
UPDATE monthly_asset_projections map
SET asset_type = ma.type
FROM multiple_assets ma
WHERE map.asset_id = ma.id
  AND map.asset_type IS NULL;

-- 既に資産が削除されている場合は履歴詳細から補完（ベストエフォート）
UPDATE monthly_asset_projections map
SET asset_type = ahd.asset_type
FROM asset_history_details ahd
WHERE map.asset_id = ahd.asset_id
  AND map.asset_type IS NULL
  AND ahd.asset_type IS NOT NULL;

