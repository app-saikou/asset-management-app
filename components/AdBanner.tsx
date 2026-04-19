import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getAdUnitId, getCurrentPlatform } from '../lib/admob';

interface AdBannerProps {
  size?: BannerAdSize;
  style?: object;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  size = BannerAdSize.ADAPTIVE_BANNER,
  style,
}) => {
  const platform = getCurrentPlatform();
  const adUnitId = getAdUnitId('banner', platform);
  const [refreshKey, setRefreshKey] = useState(0);

  // 30秒間隔でバナー広告を自動更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000); // 30秒間隔

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        key={refreshKey} // キーを変更して強制再レンダリング
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('✅ バナー広告読み込み完了');
        }}
        onAdFailedToLoad={(error) => {
          console.warn('⚠️ バナー広告読み込み失敗:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
});
