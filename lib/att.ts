import { Platform, Alert } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';

// App Tracking Transparency (ATT) の許可をリクエスト（安全化）
export const requestTrackingPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return true; // Androidでは常に許可済みとして扱う
  }

  try {
    // 少し待機してからリクエスト
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { status } =
      await TrackingTransparency.requestTrackingPermissionsAsync();
    console.log('✅ ATT permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('❌ ATT permission request error:', error);
    // エラーでもアプリは継続
    return false;
  }
};

// ATT許可状態を確認
export const checkTrackingPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return true; // Androidでは常に許可済みとして扱う
  }

  try {
    const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('ATT permission check error:', error);
    return false;
  }
};

// ATT許可の説明ダイアログを表示
export const showATTExplanation = (): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      '広告のパーソナライズ',
      'より関連性の高い広告を表示するために、アプリの使用状況を追跡することを許可しますか？\n\nこの情報は広告の配信にのみ使用され、個人を特定できる情報は収集されません。',
      [
        {
          text: '許可しない',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: '許可する',
          onPress: () => resolve(true),
        },
      ]
    );
  });
};
