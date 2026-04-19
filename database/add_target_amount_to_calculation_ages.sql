-- user_calculation_agesテーブルにtarget_amountカラムを追加
-- 目標年齢時の目標資産額を保存する

ALTER TABLE user_calculation_ages
ADD COLUMN IF NOT EXISTS target_amount NUMERIC(18, 2);

-- コメント追加
COMMENT ON COLUMN user_calculation_ages.target_amount IS '目標年齢時の目標資産額（円）';

