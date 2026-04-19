-- user_assetsテーブルの既存データ確認

-- 1. user_assetsテーブルの存在確認
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'user_assets'
    ) THEN 'user_assetsテーブルは存在します'
    ELSE 'user_assetsテーブルは存在しません'
  END as table_status;

-- 2. user_assetsテーブルのレコード数確認
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM user_assets;

-- 3. user_assetsテーブルのサンプルデータ（最大10件）
SELECT 
  id,
  user_id,
  current_assets,
  created_at,
  updated_at
FROM user_assets
ORDER BY created_at DESC
LIMIT 10;

-- 4. multiple_assetsテーブルとの比較
SELECT 
  'multiple_assets' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM multiple_assets

UNION ALL

SELECT 
  'user_assets' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM user_assets;
