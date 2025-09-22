-- UID起点でのユーザーデータ完全削除用ストアドプロシージャ
-- テーブル名を指定せず、動的にユーザー関連データを削除

CREATE OR REPLACE FUNCTION delete_user_data_completely(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  table_name TEXT;
  column_name TEXT;
  delete_count INTEGER;
  total_deleted INTEGER := 0;
  result JSON := '{}';
  table_record RECORD;
BEGIN
  -- ユーザーIDの存在確認
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', user_uuid
    );
  END IF;

  -- auth.users以外のテーブルでuser_idカラムを持つテーブルを動的に検索
  FOR table_record IN
    SELECT 
      t.table_name,
      c.column_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND c.data_type = 'uuid'
      AND t.table_name != 'users'  -- auth.usersは除外
    ORDER BY t.table_name
  LOOP
    table_name := table_record.table_name;
    column_name := table_record.column_name;
    
    -- 動的SQLでDELETE実行
    EXECUTE format('DELETE FROM %I WHERE %I = $1', table_name, column_name) 
    USING user_uuid;
    
    GET DIAGNOSTICS delete_count = ROW_COUNT;
    total_deleted := total_deleted + delete_count;
    
    -- 結果に追加（PostgreSQL互換性のため）
    result := jsonb_concat(result::jsonb, json_build_object(table_name, delete_count)::jsonb)::json;
    
    RAISE NOTICE 'Deleted % rows from table %', delete_count, table_name;
  END LOOP;

  -- 最後にauth.usersからユーザーを削除
  DELETE FROM auth.users WHERE id = user_uuid;
  GET DIAGNOSTICS delete_count = ROW_COUNT;
  
  IF delete_count > 0 THEN
    result := jsonb_concat(result::jsonb, json_build_object('auth.users', delete_count)::jsonb)::json;
    total_deleted := total_deleted + delete_count;
  END IF;

  -- 成功結果を返す
  RETURN json_build_object(
    'success', true,
    'user_id', user_uuid,
    'total_deleted', total_deleted,
    'tables_affected', result
  );

EXCEPTION
  WHEN OTHERS THEN
    -- エラー処理
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_uuid,
      'total_deleted', total_deleted,
      'tables_affected', result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限を設定（認証済みユーザーのみ）
GRANT EXECUTE ON FUNCTION delete_user_data_completely(UUID) TO authenticated;

-- 使用例:
-- SELECT delete_user_data_completely('7a515c0d-2045-4758-b561-9808777ae0b6'::UUID);
