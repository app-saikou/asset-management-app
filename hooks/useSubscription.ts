import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscriptionType: 'free' | 'premium' | null;
  expiresAt: string | null;
  isLoading: boolean;
}

export const useSubscription = () => {
  // サブスクリプション機能を一時的に無効化（テーブル未作成のため）
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>({
      isSubscribed: false,
      subscriptionType: 'free',
      expiresAt: null,
      isLoading: false,
    });

  const fetchSubscriptionStatus = async () => {
    // 現在は全ユーザーを無料ユーザーとして扱う
    setSubscriptionStatus({
      isSubscribed: false,
      subscriptionType: 'free',
      expiresAt: null,
      isLoading: false,
    });
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  return {
    ...subscriptionStatus,
    refetch: fetchSubscriptionStatus,
  };
};
