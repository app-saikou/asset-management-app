import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { Colors } from '../constants/Colors';
import { useSubscription } from '../hooks/useSubscription';
import { getAdUnitId, getCurrentPlatform } from '../lib/admob';

interface BannerAdComponentProps {
  style?: any;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: any) => void;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  style,
  onAdLoaded,
  onAdFailedToLoad,
}) => {
  // 広告機能を有効化
  const { isSubscribed, isLoading } = useSubscription();
  const [adUnitId, setAdUnitId] = useState<string>('');
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isSubscribed) {
      // 無料ユーザーのみ広告を表示
      const platform = getCurrentPlatform();
      const unitId = getAdUnitId('banner', platform);
      setAdUnitId(unitId);
    }
  }, [isSubscribed, isLoading]);

  // サブスクリプションユーザーまたはローディング中は広告を表示しない
  if (isLoading || isSubscribed || !adUnitId) {
    return null;
  }

  // 広告エラー時のフェールセーフ
  if (adError) {
    return (
      <View style={[styles.errorContainer, style]}>
        {/* エラー時は空白を表示（アプリが壊れないように） */}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false, // ATT許可に基づいて設定
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded successfully');
          setAdError(null);
          onAdLoaded?.();
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
          setAdError(error.message || 'Ad failed to load');
          onAdFailedToLoad?.(error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.semantic.background,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // バナー広告の最小高さ
    position: 'absolute',
    bottom: 88, // フッターの上に配置（フッター高さ88px + 余白12px）
    left: 0,
    right: 0,
    zIndex: 1000, // フッターより上に表示
  },
  errorContainer: {
    backgroundColor: Colors.semantic.background,
    minHeight: 50,
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
