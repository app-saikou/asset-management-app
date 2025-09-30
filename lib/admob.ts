import mobileAds from 'react-native-google-mobile-ads';
import { getAdUnitId, getCurrentPlatform } from './admob-config';

// AdMobアプリID（本番用）
export const ADMOB_APP_ID = {
  ios: 'ca-app-pub-2591881801621460~8400392557', // 本番iOSアプリID
  android: 'ca-app-pub-2591881801621460~8400392557', // 本番AndroidアプリID（同じIDを使用）
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

// プラットフォーム別の広告ユニットIDを取得（環境に応じて自動切り替え）
export { getAdUnitId, getCurrentPlatform } from './admob-config';
