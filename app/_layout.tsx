import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  // 安全なフレームワーク初期化
  try {
    useFrameworkReady();
  } catch (error) {
    console.error('フレームワーク初期化エラー:', error);
  }

  // 安全なレンダリング
  try {
    return (
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
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
