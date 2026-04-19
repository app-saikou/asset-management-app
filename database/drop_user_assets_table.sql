-- user_assetsテーブルの安全な削除スクリプト

-- 注意: このスクリプトを実行する前に、check_user_assets_data.sqlで既存データを確認してください

-- 1. トリガーの削除
DROP TRIGGER IF EXISTS update_user_assets_updated_at ON user_assets;

-- 2. ポリシーの削除
DROP POLICY IF EXISTS "Users can view their own assets" ON user_assets;
DROP POLICY IF EXISTS "Users can insert their own assets" ON user_assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON user_assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON user_assets;

-- 3. RLSの無効化
ALTER TABLE user_assets DISABLE ROW LEVEL SECURITY;

-- 4. インデックスの削除
DROP INDEX IF EXISTS idx_user_assets_user_id;
DROP INDEX IF EXISTS idx_user_assets_updated_at;

-- 5. テーブルの削除
DROP TABLE IF EXISTS user_assets;

-- 6. 確認メッセージ
SELECT 'user_assetsテーブルが正常に削除されました' as result;
