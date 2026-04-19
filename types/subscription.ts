// サブスクリプション管理用の型定義

export type PlanType = 'free' | 'pro';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export type AssetType = 'cash' | 'stock';

export type PaymentMethod = 'apple' | 'google' | 'stripe';

export type SubscriptionAction = 'subscribe' | 'cancel' | 'renew' | 'expire';

// ユーザーのサブスクリプション情報
export interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

// サブスクリプション履歴
export interface SubscriptionHistory {
  id: string;
  user_id: string;
  plan_type: PlanType;
  action: SubscriptionAction;
  amount?: number;
  currency: string;
  payment_method?: PaymentMethod;
  transaction_id?: string;
  created_at: string;
}

// 利率設定
export interface InterestRate {
  id: string;
  user_id: string;
  asset_type: AssetType;
  rate: number;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

// サブスクリプション状態（簡易版）
export interface SubscriptionStatusInfo {
  plan_type: PlanType;
  status: SubscriptionStatus;
  is_pro: boolean;
  can_customize_rates: boolean;
}

// デフォルト利率設定
export interface DefaultInterestRates {
  cash: number;
  stock: number;
}

// サブスクリプション管理用のフック
export interface UseSubscriptionReturn {
  subscription: SubscriptionStatusInfo | null;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  canCustomizeRates: boolean;
  upgradeToPro: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

// 利率管理用のフック
export interface UseInterestRatesReturn {
  rates: Record<AssetType, number>;
  isLoading: boolean;
  error: string | null;
  updateRate: (assetType: AssetType, rate: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}
