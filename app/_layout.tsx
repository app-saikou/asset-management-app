import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { InterstitialAdProvider } from '../contexts/InterstitialAdContext';
import { DisplayUnitProvider } from '../contexts/DisplayUnitContext';
import { initializeAdMob } from '../lib/admob';
import * as Linking from 'expo-linking';
import { useUserProfile } from '../hooks/useAgeBasedCalculation';
import { getNotificationStatus, scheduleMonthlyNotification } from '../lib/notifications';

// 通知再スケジュール処理（AuthProvider の内側で実行）
function NotificationRescheduler() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const hasRescheduledRef = useRef(false);

  useEffect(() => {
    // 1セッション1回のみ実行
    if (hasRescheduledRef.current) {
      return;
    }

    // ユーザーとプロフィールが揃うまで待つ
    if (!user?.id || !profile) {
      return;
    }

    // 非同期処理が完了する前に再実行されるのを防ぐため、ここで先にフラグを立てる
    hasRescheduledRef.current = true;

    const rescheduleNotification = async () => {
      try {
        // 通知が有効な場合のみ再スケジュール
        if (profile.notification_enabled !== true) {
          console.log('【通知再スケジュール】通知が無効のためスキップ');
          return;
        }

        // 通知許可状態を確認
        const permissionStatus = await getNotificationStatus();
        if (permissionStatus !== 'granted') {
          console.log('【通知再スケジュール】通知許可がないためスキップ:', permissionStatus);
          return;
        }

        // 通知を再スケジュール
        const day = profile.notification_day ?? -1;
        const hour = profile.notification_hour ?? 9;
        const notificationId = await scheduleMonthlyNotification(day, hour);

        if (notificationId) {
          console.log('【通知再スケジュール】成功:', { notificationId, day, hour });
        } else {
          console.warn('【通知再スケジュール】失敗: notificationId が null');
        }
      } catch (error) {
        console.error('【通知再スケジュール】エラー:', error);
      }
    };

    rescheduleNotification();
  }, [user?.id, profile]);

  return null;
}

export default function RootLayout() {
  // AdMob初期化とATT許可リクエスト（開発ビルド用）
  useEffect(() => {
    const initializeAds = async () => {
      try {
        // 少し遅延させて安全に初期化
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // AdMob初期化
        await initializeAdMob();

        // ATT許可リクエストは資産画面で実行
        // const attResult = await requestTrackingPermission();
      } catch (error) {
        console.error('❌ AdMob/ATT初期化エラー:', error);
      }
    };

    initializeAds();
  }, []);

  // 通知リスナーの設定（開発ビルドが必要）
  useEffect(() => {
    let notificationListener: any;
    let responseListener: any;

    const setupNotifications = async () => {
      try {
        // expo-notificationsを動的にインポート（開発ビルドが必要）
        const Notifications = await import('expo-notifications');
        
        // フォアグラウンド通知の表示設定
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        // 通知受信時のリスナー（フォアグラウンド）
        notificationListener =
          Notifications.addNotificationReceivedListener((notification) => {
            console.log('通知を受信しました:', notification);
          });

        // 通知タップ時のリスナー
        responseListener =
          Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('通知がタップされました:', response);
            const data = response.notification.request.content.data;
            const screen = data?.screen || '/inventory-step';
            // app.jsonのschemeを使って内部URLを開く
            const url = `tanao://${screen.replace(/^\//, '')}`;
            Linking.openURL(url).catch((error) => {
              console.error('画面遷移エラー:', error);
            });
          });
      } catch (error) {
        // 開発ビルドが必要な場合、エラーを無視（Expo Goでは動作しない）
        console.warn('通知機能は開発ビルドが必要です:', error);
      }
    };

    setupNotifications();

    return () => {
      if (notificationListener) {
        // 動的インポートなので、型チェックを回避
        import('expo-notifications').then((Notifications) => {
          Notifications.removeNotificationSubscription(notificationListener);
        }).catch(() => {});
      }
      if (responseListener) {
        import('expo-notifications').then((Notifications) => {
          Notifications.removeNotificationSubscription(responseListener);
        }).catch(() => {});
      }
    };
  }, []);

  // 安全なレンダリング
  return (
      <AuthProvider>
        <DisplayUnitProvider>
        <InterstitialAdProvider>
          {/* 通知再スケジュール処理 */}
          <NotificationRescheduler />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </InterstitialAdProvider>
        </DisplayUnitProvider>
      </AuthProvider>
    );
}
