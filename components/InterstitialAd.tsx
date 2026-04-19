import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useSubscription } from '../hooks/useSubscription';
import {
  getAdUnitId,
  getCurrentPlatform,
  isAdDisplayEnabled,
} from '../lib/admob-config';

interface InterstitialAdComponentProps {
  onAdClosed?: () => void;
  onAdFailedToLoad?: (error: any) => void;
}

export const useInterstitialAd = () => {
  const { isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  const [interstitialAd, setInterstitialAd] = useState<InterstitialAd | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onClosedCallbackRef = useRef<(() => void) | null>(null);

  // 広告を読み込み
  const loadAd = async () => {
    if (isAdLoading || isSubscribed || subscriptionLoading) {
      return false;
    }

    try {
      setIsAdLoading(true);
      setError(null);

      const platform = getCurrentPlatform();
      const unitId = getAdUnitId('interstitial', platform);

      // 既存の広告インスタンスがある場合はクリーンアップ
      if (interstitialAd) {
        // イベントリスナーを削除
        interstitialAd.removeAllListeners();
      }

      const ad = InterstitialAd.createForAdRequest(unitId, {
        requestNonPersonalizedAdsOnly: false, // ATT許可に基づいて設定
      });

      // 広告イベントリスナーを設定
      const unsubscribeLoaded = ad.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('✅ Interstitial ad loaded successfully');
          setIsLoaded(true);
          setIsAdLoading(false);
        }
      );

      // CLOSEDイベントリスナーを設定（Refのコールバックを呼び出す）
      const unsubscribeClosed = ad.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('📱 Interstitial ad closed - CLOSED event triggered');

          // Refに保存されたコールバックを実行
          if (onClosedCallbackRef.current) {
            console.log('📱 Executing ad closed callback...');
            try {
              onClosedCallbackRef.current();
              console.log('📱 Ad closed callback executed successfully');
            } catch (error) {
              console.error('❌ Error executing ad closed callback:', error);
            }
            // コールバックをクリア
            onClosedCallbackRef.current = null;
          }

          // コールバック実行後にisLoadedをfalseにする
          setIsLoaded(false);
        }
      );

      const unsubscribeError = ad.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.error('❌ Interstitial ad error:', error);
          setError(error.message || 'Ad failed to load');
          setIsLoaded(false);
          setIsAdLoading(false);
        }
      );

      // 追加のイベントリスナー
      const unsubscribeOpened = ad.addAdEventListener(
        AdEventType.OPENED,
        () => {
          console.log('📱 Interstitial ad opened - OPENED event triggered');
        }
      );

      const unsubscribeClicked = ad.addAdEventListener(
        AdEventType.CLICKED,
        () => {
          console.log('📱 Interstitial ad clicked - CLICKED event triggered');
        }
      );

      setInterstitialAd(ad);
      ad.load();

      // クリーンアップ関数（現在は使用しない）
      // return () => {
      //   unsubscribeLoaded();
      //   unsubscribeClosed();
      //   unsubscribeError();
      // };
    } catch (error) {
      console.error('❌ Interstitial ad load error:', error);
      setError('Failed to load ad');
      setIsAdLoading(false);
      return false;
    }
  };

  // 広告を表示
  const showAd = async (onClosed?: () => void): Promise<boolean> => {
    if (!interstitialAd || !isLoaded || isSubscribed) {
      console.log('⚠️ Interstitial ad not ready to show');
      return false;
    }

    try {
      console.log('📱 Showing interstitial ad...');

      // コールバックをRefに保存
      if (onClosed) {
        console.log('📱 Storing callback in ref');
        onClosedCallbackRef.current = onClosed;
      }

      // 広告を表示
      interstitialAd.show();
      console.log('📱 Interstitial ad show() called');
      console.log('📱 Waiting for CLOSED event...');

      return true;
    } catch (error) {
      console.error('❌ Interstitial ad show error:', error);
      // エラー時はコールバックをクリア
      onClosedCallbackRef.current = null;
      return false;
    }
  };

  // 初期化時に広告を読み込み
  useEffect(() => {
    if (!subscriptionLoading && !isSubscribed && isAdDisplayEnabled()) {
      console.log('🚀 Loading interstitial ad on mount...');
      loadAd();
    }

    // クリーンアップ関数
    return () => {
      if (interstitialAd) {
        interstitialAd.removeAllListeners();
      }
    };
  }, [isSubscribed, subscriptionLoading]);

  return {
    loadAd,
    showAd,
    isLoaded,
    isLoading: isAdLoading,
    error,
  };
};

// インタースティシャル広告を表示するフック
export const useInterstitialAdDisplay = () => {
  const { showAd, isLoaded, loadAd } = useInterstitialAd();

  const showInterstitialAd = async (
    onAdClosed?: () => void
  ): Promise<boolean> => {
    // 広告が無効の場合は表示しない
    if (!isAdDisplayEnabled()) {
      console.log('📱 広告無効: インタースティシャル広告は表示されません');
      return false;
    }

    if (!isLoaded) {
      console.log('⚠️ Interstitial ad not loaded yet, loading now...');
      // 広告が読み込まれていない場合は読み込みを試行
      await loadAd();
      return false;
    }

    console.log('🎯 Attempting to show interstitial ad...');

    // 広告を表示（コールバックを直接渡す）
    const result = await showAd(onAdClosed);

    // 広告表示後、次の広告は読み込まない（CLOSEDイベント後に読み込む）
    // if (result) {
    //   console.log('📱 Loading next ad after showing current one...');
    //   setTimeout(() => {
    //     loadAd();
    //   }, 1000);
    // }

    return result;
  };

  return {
    showInterstitialAd,
    isAdReady: isLoaded,
  };
};
