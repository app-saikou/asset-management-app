import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';
import { initializeAdMob } from '../lib/admob';
import { requestTrackingPermission } from '../lib/att';

export default function RootLayout() {
  // 安全なフレームワーク初期化
  try {
    useFrameworkReady();
  } catch (error) {
    console.error('フレームワーク初期化エラー:', error);
  }

  // AdMob初期化とATT許可リクエスト（開発ビルド用）
  useEffect(() => {
    const initializeAds = async () => {
      try {
        console.log('🚀 AdMob初期化開始...');

        // 少し遅延させて安全に初期化
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // AdMob初期化
        const adMobResult = await initializeAdMob();
        console.log('✅ AdMob初期化結果:', adMobResult);

        // ATT許可リクエスト（iOSのみ）
        const attResult = await requestTrackingPermission();
        console.log('✅ ATT許可結果:', attResult);
      } catch (error) {
        console.error('❌ AdMob/ATT初期化エラー:', error);
      }
    };

    initializeAds();
  }, []);

  // 安全なレンダリング
  try {
    return (
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    );
  } catch (error) {
    console.error('レンダリングエラー:', error);
    // フォールバック用の最小限のUI
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
    );
  }
}
