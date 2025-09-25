import mobileAds from 'react-native-google-mobile-ads';

// AdMobアプリID（テスト用）
// 本番環境では実際のAdMobアプリIDに変更してください
export const ADMOB_APP_ID = {
  ios: 'ca-app-pub-3940256099942544~1458002511', // テスト用iOSアプリID
  android: 'ca-app-pub-3940256099942544~3347511713', // テスト用AndroidアプリID
};

// 広告ユニットID（テスト用）
// 本番環境では実際のAdMob広告ユニットIDに変更してください
export const AD_UNIT_IDS = {
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716', // テスト用バナー広告
    android: 'ca-app-pub-3940256099942544/6300978111', // テスト用バナー広告
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910', // テスト用インタースティシャル広告
    android: 'ca-app-pub-3940256099942544/1033173712', // テスト用インタースティシャル広告
  },
};

// AdMob初期化（安全化）
export const initializeAdMob = async () => {
  try {
    // 初期化前に少し待機
    await new Promise((resolve) => setTimeout(resolve, 500));

    // AdMob初期化
    await mobileAds().initialize();
    console.log('✅ AdMob initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ AdMob initialization failed:', error);
    // エラーでもアプリは継続
    return false;
  }
};

// プラットフォーム別の広告ユニットIDを取得
export const getAdUnitId = (
  adType: 'banner' | 'interstitial',
  platform: 'ios' | 'android'
) => {
  return AD_UNIT_IDS[adType][platform];
};

// 現在のプラットフォームを取得
export const getCurrentPlatform = (): 'ios' | 'android' => {
  return Platform.OS as 'ios' | 'android';
};

import { Platform } from 'react-native';
