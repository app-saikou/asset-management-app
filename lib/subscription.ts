import { supabase } from './supabase';
import type {
  UserSubscription,
  SubscriptionHistory,
  InterestRate,
  SubscriptionStatusInfo,
  PlanType,
  AssetType,
  SubscriptionAction,
  PaymentMethod,
  DefaultInterestRates,
} from '../types/subscription';

// デフォルト利率設定
export const DEFAULT_INTEREST_RATES: DefaultInterestRates = {
  cash: 0.0, // 現金 0%
  stock: 5.0, // 株式 5%
};

// ユーザーのサブスクリプション状態を取得
export async function getUserSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatusInfo> {
  try {
    const { data, error } = await supabase.rpc('get_user_subscription_status', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error fetching subscription status:', error);
      // エラーの場合は無料プランとして返す
      return {
        plan_type: 'free',
        status: 'active',
        is_pro: false,
        can_customize_rates: false,
      };
    }

    if (data && data.length > 0) {
      return data[0];
    }

    // データがない場合は無料プランとして返す
    return {
      plan_type: 'free',
      status: 'active',
      is_pro: false,
      can_customize_rates: false,
    };
  } catch (error) {
    console.error('Error in getUserSubscriptionStatus:', error);
    return {
      plan_type: 'free',
      status: 'active',
      is_pro: false,
      can_customize_rates: false,
    };
  }
}

// ユーザーの利率を取得
export async function getUserInterestRate(
  userId: string,
  assetType: AssetType
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_user_interest_rate', {
      user_uuid: userId,
      asset_type_param: assetType,
    });

    if (error) {
      console.error('Error fetching interest rate:', error);
      return DEFAULT_INTEREST_RATES[assetType];
    }

    return data || DEFAULT_INTEREST_RATES[assetType];
  } catch (error) {
    console.error('Error in getUserInterestRate:', error);
    return DEFAULT_INTEREST_RATES[assetType];
  }
}

// ユーザーの全利率を取得
export async function getUserInterestRates(
  userId: string
): Promise<Record<AssetType, number>> {
  const rates: Record<AssetType, number> = {} as Record<AssetType, number>;

  for (const assetType of Object.keys(DEFAULT_INTEREST_RATES) as AssetType[]) {
    rates[assetType] = await getUserInterestRate(userId, assetType);
  }

  return rates;
}

// 利率を更新（Proプランのみ）
export async function updateInterestRate(
  userId: string,
  assetType: AssetType,
  rate: number
): Promise<void> {
  try {
    // まずユーザーがProプランかチェック
    const subscription = await getUserSubscriptionStatus(userId);
    if (!subscription.can_customize_rates) {
      throw new Error('利率の変更はProプラン限定機能です');
    }

    const { error } = await supabase.from('interest_rates').upsert({
      user_id: userId,
      asset_type: assetType,
      rate: rate,
      is_custom: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating interest rate:', error);
    throw error;
  }
}

// 利率をデフォルトにリセット
export async function resetInterestRatesToDefaults(
  userId: string
): Promise<void> {
  try {
    const subscription = await getUserSubscriptionStatus(userId);
    if (!subscription.can_customize_rates) {
      throw new Error('利率の変更はProプラン限定機能です');
    }

    // カスタム利率を削除
    const { error } = await supabase
      .from('interest_rates')
      .delete()
      .eq('user_id', userId)
      .eq('is_custom', true);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error resetting interest rates:', error);
    throw error;
  }
}

// サブスクリプション履歴を記録
export async function logSubscriptionHistory(
  userId: string,
  planType: PlanType,
  action: SubscriptionAction,
  amount?: number,
  paymentMethod?: PaymentMethod,
  transactionId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('subscription_history').insert({
      user_id: userId,
      plan_type: planType,
      action: action,
      amount: amount,
      currency: 'JPY',
      payment_method: paymentMethod,
      transaction_id: transactionId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error logging subscription history:', error);
    throw error;
  }
}

// Proプランにアップグレード
export async function upgradeToPro(
  userId: string,
  paymentMethod: PaymentMethod,
  transactionId: string,
  amount: number
): Promise<void> {
  try {
    // サブスクリプション状態を更新
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        plan_type: 'pro',
        status: 'active',
        start_date: new Date().toISOString(),
        auto_renew: true,
        updated_at: new Date().toISOString(),
      });

    if (subscriptionError) {
      throw subscriptionError;
    }

    // 履歴を記録
    await logSubscriptionHistory(
      userId,
      'pro',
      'subscribe',
      amount,
      paymentMethod,
      transactionId
    );
  } catch (error) {
    console.error('Error upgrading to Pro:', error);
    throw error;
  }
}

// サブスクリプションをキャンセル
export async function cancelSubscription(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // 履歴を記録
    await logSubscriptionHistory(userId, 'pro', 'cancel');
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}
