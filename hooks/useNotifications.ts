import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUserProfile } from './useAgeBasedCalculation';
import { supabase } from '../lib/supabase';
import {
  requestNotificationPermission,
  getNotificationStatus,
  scheduleMonthlyNotification,
  cancelAllNotifications,
  updateNotificationSchedule,
} from '../lib/notifications';

export interface UseNotificationsReturn {
  notificationEnabled: boolean;
  notificationDay: number; // -1: 月末, 1-31: 指定日
  notificationHour: number; // 0-23時
  isLoading: boolean;
  error: string | null;
  updateNotificationSettings: (
    enabled: boolean,
    day: number,
    hour?: number
  ) => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationDay, setNotificationDay] = useState(-1); // デフォルト: 月末
  const [notificationHour, setNotificationHour] = useState(9); // デフォルト: 9時
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プロフィールから通知設定を読み込む
  const loadNotificationSettings = useCallback(async () => {
    if (!user?.id || !profile) return;

    try {
      setNotificationEnabled(profile.notification_enabled ?? false);
      setNotificationDay(profile.notification_day ?? -1);
      setNotificationHour(profile.notification_hour ?? 9);
    } catch (err: any) {
      console.error('通知設定の読み込みエラー:', err);
      setError(err.message || '通知設定の読み込みに失敗しました');
    }
  }, [user?.id, profile]);

  useEffect(() => {
    loadNotificationSettings();
  }, [loadNotificationSettings]);

  // 通知設定を更新
  const updateNotificationSettings = useCallback(
    async (
      enabled: boolean,
      day: number,
      hour: number = 9
    ): Promise<boolean> => {
      if (!user?.id) {
        setError('ユーザー情報が不足しています');
        return false;
      }

      setIsLoading(true);
      setError(null);

      // オプティミスティック更新（UI即時反映）
      const prevEnabled = notificationEnabled;
      const prevDay = notificationDay;
      const prevHour = notificationHour;
      setNotificationEnabled(enabled);
      setNotificationDay(day);
      setNotificationHour(hour);

      try {
        if (enabled) {
          // 通知が有効な場合、通知許可を確認
          const permissionStatus = await getNotificationStatus();
          if (permissionStatus !== 'granted') {
            setError('通知許可が必要です');
            setIsLoading(false);
            return false;
          }

          // 通知をスケジュール
          const notificationId = await scheduleMonthlyNotification(day, hour);
          if (!notificationId) {
            setError('通知のスケジュールに失敗しました');
            setIsLoading(false);
            return false;
          }
        } else {
          // 通知が無効な場合、すべての通知をキャンセル（許可チェック不要）
          await cancelAllNotifications();
        }

        // データベースを更新
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            notification_enabled: enabled,
            notification_day: day,
            notification_hour: hour,
          })
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }

        // プロフィールを再取得
        await updateProfile({
          notification_enabled: enabled,
          notification_day: day,
          notification_hour: hour,
        });

        setIsLoading(false);
        return true;
      } catch (err: any) {
        // 失敗時はオプティミスティック更新を元に戻す
        setNotificationEnabled(prevEnabled);
        setNotificationDay(prevDay);
        setNotificationHour(prevHour);
        console.error('通知設定更新エラー:', err);
        setError(err.message || '通知設定の更新に失敗しました');
        setIsLoading(false);
        return false;
      }
    },
    [user?.id, updateProfile, notificationEnabled, notificationDay, notificationHour]
  );

  // 通知許可をリクエスト
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await requestNotificationPermission();
      return status === 'granted';
    } catch (err: any) {
      console.error('通知許可リクエストエラー:', err);
      setError(err.message || '通知許可のリクエストに失敗しました');
      return false;
    }
  }, []);

  // 設定を再取得
  const refetch = useCallback(async () => {
    await loadNotificationSettings();
  }, [loadNotificationSettings]);

  return {
    notificationEnabled,
    notificationDay,
    notificationHour,
    isLoading,
    error,
    updateNotificationSettings,
    requestPermission,
    refetch,
  };
}

