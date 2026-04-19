import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserSubscriptionStatus,
  getUserInterestRates,
  updateInterestRate,
  resetInterestRatesToDefaults,
  upgradeToPro,
  cancelSubscription,
  DEFAULT_INTEREST_RATES,
} from '../lib/subscription';
import type {
  UseSubscriptionReturn,
  UseInterestRatesReturn,
  SubscriptionStatusInfo,
  AssetType,
} from '../types/subscription';

// サブスクリプション状態管理用のHook
export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] =
    useState<SubscriptionStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const status = await getUserSubscriptionStatus(user.id);
      setSubscription(status);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'サブスクリプション情報の取得に失敗しました'
      );
      console.error('Error fetching subscription status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const upgradeToProPlan = useCallback(async () => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    try {
      // 実際の決済処理はここで実装
      // 例: Apple In-App Purchase, Google Play Billing, Stripe等
      const mockTransactionId = `txn_${Date.now()}`;
      const amount = 980; // 月額980円（例）

      await upgradeToPro(user.id, 'apple', mockTransactionId, amount);
      await fetchSubscriptionStatus();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Proプランへのアップグレードに失敗しました';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchSubscriptionStatus]);

  const cancelSubscriptionPlan = useCallback(async () => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    try {
      await cancelSubscription(user.id);
      await fetchSubscriptionStatus();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'サブスクリプションのキャンセルに失敗しました';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchSubscriptionStatus]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return {
    subscription,
    isLoading,
    error,
    isPro: subscription?.is_pro || false,
    canCustomizeRates: subscription?.can_customize_rates || false,
    upgradeToPro: upgradeToProPlan,
    cancelSubscription: cancelSubscriptionPlan,
  };
}

// 利率管理用のHook
export function useInterestRates(): UseInterestRatesReturn {
  const { user } = useAuth();
  const { canCustomizeRates } = useSubscription();
  const [rates, setRates] = useState<Record<AssetType, number>>(
    DEFAULT_INTEREST_RATES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterestRates = useCallback(async () => {
    if (!user) {
      setRates(DEFAULT_INTEREST_RATES);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const userRates = await getUserInterestRates(user.id);
      setRates(userRates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '利率情報の取得に失敗しました'
      );
      console.error('Error fetching interest rates:', err);
      setRates(DEFAULT_INTEREST_RATES);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateRate = useCallback(
    async (assetType: AssetType, rate: number) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      if (!canCustomizeRates) {
        throw new Error('利率の変更はProプラン限定機能です');
      }

      try {
        setError(null);
        await updateInterestRate(user.id, assetType, rate);
        setRates((prev) => ({ ...prev, [assetType]: rate }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '利率の更新に失敗しました';
        setError(errorMessage);
        throw err;
      }
    },
    [user, canCustomizeRates]
  );

  const resetToDefaults = useCallback(async () => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    if (!canCustomizeRates) {
      throw new Error('利率の変更はProプラン限定機能です');
    }

    try {
      setError(null);
      await resetInterestRatesToDefaults(user.id);
      setRates(DEFAULT_INTEREST_RATES);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '利率のリセットに失敗しました';
      setError(errorMessage);
      throw err;
    }
  }, [user, canCustomizeRates]);

  useEffect(() => {
    fetchInterestRates();
  }, [fetchInterestRates]);

  return {
    rates,
    isLoading,
    error,
    updateRate,
    resetToDefaults,
  };
}
