-- サブスクリプション管理用テーブル設計

-- ユーザーのサブスクリプション状態
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'pro'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- サブスクリプション履歴
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'subscribe', 'cancel', 'renew', 'expire'
  amount DECIMAL(10,2), -- 金額（円）
  currency VARCHAR(3) DEFAULT 'JPY',
  payment_method VARCHAR(50), -- 'apple', 'google', 'stripe'
  transaction_id VARCHAR(255), -- 外部決済システムのトランザクションID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 利率設定（Proプラン限定）
CREATE TABLE interest_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type VARCHAR(20) NOT NULL, -- 'cash', 'stocks', 'bonds', 'crypto'
  rate DECIMAL(5,2) NOT NULL, -- 年利率（%）
  is_custom BOOLEAN DEFAULT false, -- カスタム設定かどうか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, asset_type)
);

-- デフォルト利率設定（無料プラン用）
INSERT INTO interest_rates (user_id, asset_type, rate, is_custom) VALUES
  (NULL, 'cash', 0.00, false), -- 全ユーザー共通の現金利率
  (NULL, 'stocks', 5.00, false); -- 全ユーザー共通の株式利率

-- インデックス
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_interest_rates_user_id ON interest_rates(user_id);

-- RLS (Row Level Security) ポリシー
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_rates ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のサブスクリプション情報のみアクセス可能
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own interest rates" ON interest_rates
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own interest rates" ON interest_rates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interest rates" ON interest_rates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 関数: ユーザーのサブスクリプション状態を取得
CREATE OR REPLACE FUNCTION get_user_subscription_status(user_uuid UUID)
RETURNS TABLE (
  plan_type VARCHAR(20),
  status VARCHAR(20),
  is_pro BOOLEAN,
  can_customize_rates BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.plan_type, 'free') as plan_type,
    COALESCE(us.status, 'active') as status,
    (COALESCE(us.plan_type, 'free') = 'pro' AND COALESCE(us.status, 'active') = 'active') as is_pro,
    (COALESCE(us.plan_type, 'free') = 'pro' AND COALESCE(us.status, 'active') = 'active') as can_customize_rates
  FROM user_subscriptions us
  WHERE us.user_id = user_uuid
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: ユーザーの利率を取得（Proプランならカスタム、無料ならデフォルト）
CREATE OR REPLACE FUNCTION get_user_interest_rate(user_uuid UUID, asset_type_param VARCHAR(20))
RETURNS DECIMAL(5,2) AS $$
DECLARE
  user_plan VARCHAR(20);
  custom_rate DECIMAL(5,2);
  default_rate DECIMAL(5,2);
BEGIN
  -- ユーザーのプランタイプを取得
  SELECT plan_type INTO user_plan
  FROM get_user_subscription_status(user_uuid)
  LIMIT 1;
  
  -- Proプランの場合、カスタム利率を取得
  IF user_plan = 'pro' THEN
    SELECT rate INTO custom_rate
    FROM interest_rates
    WHERE user_id = user_uuid AND asset_type = asset_type_param
    LIMIT 1;
    
    IF custom_rate IS NOT NULL THEN
      RETURN custom_rate;
    END IF;
  END IF;
  
  -- デフォルト利率を取得
  SELECT rate INTO default_rate
  FROM interest_rates
  WHERE user_id IS NULL AND asset_type = asset_type_param
  LIMIT 1;
  
  RETURN COALESCE(default_rate, 0.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
