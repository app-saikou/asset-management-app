-- オンボーディング機能用のデータベーススキーマ更新

-- 1. user_profilesテーブルにオンボーディング関連カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. 既存ユーザー用のマイグレーション
-- 既存のuser_profilesレコードをonboarding_completed = trueに更新
UPDATE user_profiles 
SET onboarding_completed = TRUE 
WHERE onboarding_completed IS FALSE;

-- 3. 新規ユーザー用のデフォルト値設定
-- 新規ユーザー登録時にuser_profilesが自動作成されるようにトリガーを追加
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーにuser_profilesレコードを作成（onboarding_completed = false）
  INSERT INTO public.user_profiles (user_id, birth_date, onboarding_completed, name)
  VALUES (NEW.id, '1990-01-01'::date, false, 'ユーザー'); -- デフォルト値
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもユーザー作成は続行
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成（既存のトリガーと重複しないようにチェック）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_add_profile'
  ) THEN
    CREATE TRIGGER on_auth_user_created_add_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();
  END IF;
END $$;
