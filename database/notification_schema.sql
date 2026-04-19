-- user_profilesテーブルに通知設定カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_day INTEGER DEFAULT -1, -- -1: 月末, 1-31: 指定日
ADD COLUMN IF NOT EXISTS notification_hour INTEGER DEFAULT 9; -- 通知時間（0-23時、デフォルト9時）

