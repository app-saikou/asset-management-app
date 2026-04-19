-- user_calculation_agesテーブルにtarget_monthカラムを追加（存在しない場合）
-- 既存データにはデフォルト値0を設定

ALTER TABLE user_calculation_ages
ADD COLUMN IF NOT EXISTS target_month INTEGER DEFAULT 0 CHECK (target_month >= 0 AND target_month <= 11);

-- 既存データでtarget_monthがNULLの場合は0に更新
UPDATE user_calculation_ages
SET target_month = 0
WHERE target_month IS NULL;

-- NOT NULL制約を追加（既にデフォルト値があるので安全）
ALTER TABLE user_calculation_ages
ALTER COLUMN target_month SET NOT NULL;

-- コメント追加
COMMENT ON COLUMN user_calculation_ages.target_month IS '目標年齢の月（0-11ヶ月）';

