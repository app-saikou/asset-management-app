import { Alert } from 'react-native';
import * as Linking from 'expo-linking';

// expo-notificationsを動的にインポート（開発ビルドが必要）
let Notifications: typeof import('expo-notifications') | null = null;

const getNotifications = async () => {
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
      // 通知の表示方法を設定（存在する場合のみ）
      if (Notifications && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      }
    } catch (error) {
      console.warn('通知機能は開発ビルドが必要です:', error);
      return null;
    }
  }
  return Notifications;
};

/**
 * 通知許可をリクエスト
 * @returns 許可状態（granted: 許可, denied: 拒否, undetermined: 未決定）
 */
export async function requestNotificationPermission(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  try {
    console.log('【通知許可】requestNotificationPermission 開始');
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      console.warn(
        '【通知許可】NotificationsModuleが取得できませんでした。開発ビルドが必要です。'
      );
      // Expo Goなどの場合は、undetermined を返す（実際の状態は不明）
      return 'undetermined';
    }

    console.log('【通知許可】現在の許可状態を取得中...');
    const { status: existingStatus } =
      await NotificationsModule.getPermissionsAsync();
    console.log('【通知許可】現在の許可状態:', existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus === 'granted') {
      console.log('【通知許可】既に許可されています');
    } else if (existingStatus === 'denied') {
      // 既に拒否されている場合は、requestPermissionsAsync()を呼んでもダイアログは表示されない
      // そのため、denied のまま返す（呼び出し側で設定アプリ誘導モーダルを表示する）
      console.log(
        '【通知許可】既に拒否されているため、requestPermissionsAsync()は呼びません'
      );
    } else if (existingStatus === 'undetermined') {
      // 未決定の場合のみ、requestPermissionsAsync()を呼ぶ（iOSダイアログが表示される）
      console.log(
        '【通知許可】許可がまだ取得されていないため、リクエストします...'
      );
      const { status } = await NotificationsModule.requestPermissionsAsync();
      console.log('【通知許可】リクエスト後の許可状態:', status);
      finalStatus = status;
    }

    console.log('【通知許可】最終的な許可状態:', finalStatus);
    return finalStatus;
  } catch (error) {
    console.error('【通知許可】通知許可リクエストエラー:', error);
    console.error('【通知許可】エラー詳細:', JSON.stringify(error));
    // エラー時は undetermined を返す（実際の状態は不明）
    return 'undetermined';
  }
}

/**
 * オンボーディング後の通知許可リクエスト（強制的にiOSダイアログを表示）
 * @returns 許可状態（granted: 許可, denied: 拒否, undetermined: 未決定）
 */
export async function requestNotificationPermissionForOnboarding(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  try {
    console.log(
      '【オンボーディング通知許可】requestNotificationPermissionForOnboarding 開始'
    );
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      console.warn(
        '【オンボーディング通知許可】NotificationsModuleが取得できませんでした'
      );
      return 'undetermined';
    }

    // 現在の許可状態を確認（デバッグ用）
    const { status: currentStatus } =
      await NotificationsModule.getPermissionsAsync();
    console.log('【オンボーディング通知許可】現在の許可状態:', currentStatus);

    // 状態に関係なく、常にrequestPermissionsAsync()を呼ぶ
    console.log(
      '【オンボーディング通知許可】requestPermissionsAsync()を呼び出します...'
    );
    const { status } = await NotificationsModule.requestPermissionsAsync();
    console.log(
      '【オンボーディング通知許可】requestPermissionsAsync()の結果:',
      status
    );

    // iOSでは、既にdeniedの場合はrequestPermissionsAsync()を呼んでもダイアログが表示されない
    // その場合、statusはdeniedのまま返される
    if (currentStatus === 'denied' && status === 'denied') {
      console.warn(
        '【オンボーディング通知許可】既に拒否されているため、iOSダイアログは表示されませんでした'
      );
    }

    return status;
  } catch (error) {
    console.error(
      '【オンボーディング通知許可】通知許可リクエストエラー:',
      error
    );
    console.error(
      '【オンボーディング通知許可】エラー詳細:',
      JSON.stringify(error)
    );
    return 'undetermined';
  }
}

/**
 * 通知許可状態を取得
 * @returns 許可状態
 */
export async function getNotificationStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  try {
    console.log('【通知許可状態取得】getNotificationStatus 開始');
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      console.warn(
        '【通知許可状態取得】NotificationsModuleが取得できませんでした。Expo Goを使用している可能性があります。'
      );
      // Expo Goなどの場合は、undetermined を返す（実際の状態は不明）
      return 'undetermined';
    }

    console.log('【通知許可状態取得】getPermissionsAsync 呼び出し中...');
    const { status } = await NotificationsModule.getPermissionsAsync();
    console.log('【通知許可状態取得】取得した状態:', status);
    console.log('【通知許可状態取得】status type:', typeof status);
    console.log('【通知許可状態取得】status value:', JSON.stringify(status));

    // 状態が 'granted' | 'denied' | 'undetermined' 以外の場合のチェック
    if (
      status !== 'granted' &&
      status !== 'denied' &&
      status !== 'undetermined'
    ) {
      console.warn('【通知許可状態取得】予期しない状態:', status);
      return 'undetermined';
    }

    return status;
  } catch (error) {
    console.error('【通知許可状態取得】通知許可状態取得エラー:', error);
    console.error('【通知許可状態取得】エラー詳細:', JSON.stringify(error));
    // エラー時は undetermined を返す（実際の状態は不明）
    return 'undetermined';
  }
}

/**
 * 月末の日付を計算
 * @param year 年
 * @param month 月（1-12）
 * @returns 月末の日付
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 次回通知日を計算（月末対応）
 * @param day 通知日（-1: 月末, 1-31: 指定日）
 * @returns 次回通知日のDateオブジェクト
 */
export function calculateNextNotificationDate(day: number, hour: number = 9): Date {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12
  let targetDay: number;

  if (day === -1) {
    targetDay = getLastDayOfMonth(year, month);
  } else {
    targetDay = day;
  }

  // 今月の通知日時を計算（時刻を含めて比較）
  const thisMonthDate = new Date(year, month - 1, targetDay, hour, 0, 0);

  // 今月の通知日時が過ぎている場合は来月
  if (thisMonthDate <= now) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    if (day === -1) {
      targetDay = getLastDayOfMonth(year, month);
    }
  }

  return new Date(year, month - 1, targetDay, hour, 0, 0);
}

/**
 * 毎月指定日の指定時間に通知をスケジュール
 * @param day 通知日（-1: 月末, 1-31: 指定日）
 * @param hour 通知時間（0-23時、デフォルト9時）
 * @returns 通知ID
 */
export async function scheduleMonthlyNotification(
  day: number,
  hour: number = 9
): Promise<string | null> {
  try {
    // 既存の通知をキャンセル
    await cancelAllNotifications();

    // 通知をスケジュール
    // 月末の場合は、毎月の最終日を計算する必要があるが、
    // expo-notificationsのtriggerでは月末を直接指定できないため、
    // 毎月28-31日の範囲で最大日を指定する必要がある
    // ただし、より正確な実装のため、次回通知日を計算してからスケジュール
    // 次回通知日時を計算（時刻を含めて正確に判定）
    const nextDate = calculateNextNotificationDate(day, hour);

    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      console.warn('通知機能は開発ビルドが必要です');
      return null;
    }

    // 単発トリガー: repeats: true + 固定日は短い月（2月など）でスキップされるため、
    // 毎回アプリ起動時に次回日付を計算して再スケジュールする方式に変更
    const notificationId = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: '棚卸しの時間です',
        body: '今月も資産を棚卸ししませんか？3分で終わります',
        data: { screen: '/inventory-step' },
        sound: true,
      },
      trigger: {
        type: 'date',
        date: nextDate,
      },
    });

    console.log('通知をスケジュールしました:', {
      notificationId,
      nextDate: nextDate.toISOString(),
      day: day,
      hour,
    });

    return notificationId;
  } catch (error) {
    console.error('通知スケジュールエラー:', error);
    return null;
  }
}

/**
 * すべての通知をキャンセル
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    const NotificationsModule = await getNotifications();
    if (!NotificationsModule) {
      return;
    }

    await NotificationsModule.cancelAllScheduledNotificationsAsync();
    console.log('すべての通知をキャンセルしました');
  } catch (error) {
    console.error('通知キャンセルエラー:', error);
  }
}

/**
 * 通知スケジュールを更新
 * @param day 通知日（-1: 月末, 1-31: 指定日）
 * @param hour 通知時間（0-23時、デフォルト9時）
 */
export async function updateNotificationSchedule(
  day: number,
  hour: number = 9
): Promise<string | null> {
  return scheduleMonthlyNotification(day, hour);
}

/**
 * 設定アプリを開く（通知設定画面へ誘導）
 */
export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.error('設定アプリを開くエラー:', error);
    Alert.alert('エラー', '設定アプリを開くことができませんでした');
  }
}
