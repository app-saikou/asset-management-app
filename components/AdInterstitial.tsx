import React, { useEffect, useState } from 'react';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { getAdUnitId, getCurrentPlatform } from '../lib/admob';

export const useInterstitialAd = () => {
  const [interstitialAd, setInterstitialAd] = useState<InterstitialAd | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const platform = getCurrentPlatform();
    const adUnitId = getAdUnitId('interstitial', platform);

    // インタースティシャル広告を作成
    const ad = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    // 広告読み込み完了イベント
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ インタースティシャル広告読み込み完了');
      setIsLoaded(true);
    });

    // 広告読み込み失敗イベント
    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('⚠️ インタースティシャル広告読み込み失敗:', error);
        setIsLoaded(false);
      }
    );

    // 広告表示完了イベント
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('📱 インタースティシャル広告閉じられました');
      setIsLoaded(false);
      // 新しい広告を読み込み
      ad.load();
    });

    setInterstitialAd(ad);
    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();
    };
  }, []);

  const showAd = () => {
    if (interstitialAd && isLoaded) {
      interstitialAd.show();
      return true;
    }
    return false;
  };

  return { showAd, isLoaded };
};
