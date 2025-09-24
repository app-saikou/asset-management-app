-- asset_history_details テーブルのセキュリティ設定

-- Row Level Security (RLS) を有効化
ALTER TABLE asset_history_details ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の履歴詳細のみ閲覧可能
CREATE POLICY "Users can view their own history details." ON asset_history_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM asset_history 
      WHERE asset_history.id = asset_history_details.history_id 
      AND asset_history.user_id = auth.uid()
    )
  );

-- ユーザーは自分の履歴詳細のみ作成可能
CREATE POLICY "Users can create their own history details." ON asset_history_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM asset_history 
      WHERE asset_history.id = asset_history_details.history_id 
      AND asset_history.user_id = auth.uid()
    )
  );

-- ユーザーは自分の履歴詳細のみ更新可能
CREATE POLICY "Users can update their own history details." ON asset_history_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM asset_history 
      WHERE asset_history.id = asset_history_details.history_id 
      AND asset_history.user_id = auth.uid()
    )
  );

-- ユーザーは自分の履歴詳細のみ削除可能
CREATE POLICY "Users can delete their own history details." ON asset_history_details
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM asset_history 
      WHERE asset_history.id = asset_history_details.history_id 
      AND asset_history.user_id = auth.uid()
    )
  );

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_asset_history_details_history_id 
ON asset_history_details(history_id);

-- Realtime更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE asset_history_details;
