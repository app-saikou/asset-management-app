import { Platform } from 'react-native';

// 環境判定
const isProduction = __DEV__ === false;

// AdMob承認状況（手動で切り替え）
const isAdMobApproved = true; // App Store登録・AdMob承認後にtrueに変更

// 広告表示の有効/無効（App Store申請時はfalse推奨）
const isAdEnabled = true; // App Store申請時はfalse、AdMob承認後にtrueに変更

// テスト用ID
const TEST_AD_UNIT_IDS = {
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
};

// 本番用ID
const PRODUCTION_AD_UNIT_IDS = {
  banner: {
    ios: 'ca-app-pub-2591881801621460/4195863161',
    android: 'ca-app-pub-2591881801621460/4195863161',
  },
  interstitial: {
    ios: 'ca-app-pub-2591881801621460/8703644881',
    android: 'ca-app-pub-2591881801621460/8703644881',
  },
};

// 広告表示の有効/無効を判定
export const isAdDisplayEnabled = () => {
  return isAdEnabled;
};

// 環境に応じたIDを返す
export const getAdUnitId = (
  adType: 'banner' | 'interstitial',
  platform: 'ios' | 'android'
) => {
  // 広告が無効の場合はテストIDを返す（表示されない）
  if (!isAdEnabled) {
    console.log(`📱 広告無効: ${adType} は表示されません`);
    return TEST_AD_UNIT_IDS[adType][platform];
  }

  // 本番環境かつAdMob承認済みの場合のみ本番IDを使用
  const useProductionIds = isProduction && isAdMobApproved;
  const adUnitIds = useProductionIds
    ? PRODUCTION_AD_UNIT_IDS
    : TEST_AD_UNIT_IDS;

  console.log(
    `📱 広告ID使用: ${useProductionIds ? '本番' : 'テスト'} (${adType})`
  );
  return adUnitIds[adType][platform];
};

// 現在のプラットフォームを取得
export const getCurrentPlatform = (): 'ios' | 'android' => {
  return Platform.OS as 'ios' | 'android';
};

// 環境情報
export const getEnvironmentInfo = () => {
  const useProductionIds = isProduction && isAdMobApproved;
  return {
    isProduction,
    isAdMobApproved,
    isAdEnabled,
    useProductionIds,
    environment: isProduction ? 'production' : 'development',
    adType: !isAdEnabled
      ? '広告無効'
      : useProductionIds
      ? '本番広告'
      : 'テスト広告',
    status: !isAdEnabled
      ? '広告無効'
      : useProductionIds
      ? 'AdMob承認済み'
      : 'AdMob未承認',
  };
};
