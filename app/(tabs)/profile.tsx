import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  User,
  LogOut,
  Trash2,
  AlertTriangle,
  X,
  GripVertical,
  Edit3,
  ChevronRight,
  Target,
  Wallet,
  Bell,
  Calendar,
  RotateCcw,
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useSubscription } from '../../hooks/useSubscription';
import {
  useUserProfile,
  useCalculationAges,
} from '../../hooks/useAgeBasedCalculation';
import SubscriptionModal from '../../components/SubscriptionModal';
import BirthDateModal from '../../components/BirthDateModal';
import NotificationPermissionModal from '../../components/NotificationPermissionModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import { useNotifications } from '../../hooks/useNotifications';
import {
  getNotificationStatus,
  requestNotificationPermission,
  openNotificationSettings,
} from '../../lib/notifications';

import { LucideIcon } from 'lucide-react-native';

// 再利用可能な設定セクションコンポーネント
const SettingSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

// 再利用可能な設定項目コンポーネント
const SettingItem = ({
  icon: Icon,
  label,
  onPress,
  isDestructive = false,
  showChevron = true,
  value,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
  value?: string;
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.settingIconContainer,
        isDestructive && styles.destructiveIconContainer,
      ]}
    >
      <Icon
        size={20}
        color={isDestructive ? Colors.accent.error[600] : Colors.primary[600]}
      />
    </View>
    <View style={styles.settingLabelContainer}>
      <Text
        style={[styles.settingLabel, isDestructive && styles.destructiveLabel]}
      >
        {label}
      </Text>
    </View>
    <View style={styles.settingValueContainer}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {showChevron && (
        <ChevronRight size={20} color={Colors.semantic.text.tertiary} />
      )}
    </View>
  </TouchableOpacity>
);

// モーダル内のリストアイテムコンポーネント
const ConfigListItem = ({
  label,
  value,
  onEdit,
  onDelete,
  showDelete = true,
  icon: Icon = GripVertical,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  icon?: LucideIcon;
}) => (
  <View style={styles.configListItem}>
    <View style={styles.configListItemContent}>
      <Icon size={20} color={Colors.semantic.text.tertiary} />
      <Text style={styles.configListItemLabel}>
        {label}
        {value && <Text style={styles.configListItemValue}>{value}</Text>}
      </Text>
    </View>
    <View style={styles.configListItemActions}>
      <TouchableOpacity
        style={styles.configActionButton}
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <Edit3 size={20} color={Colors.primary[600]} />
      </TouchableOpacity>
      {showDelete && onDelete && (
        <TouchableOpacity
          style={styles.configActionButton}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color={Colors.accent.error[600]} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [birthDateModalVisible, setBirthDateModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{
    id: string;
    targetAge: number;
    targetMonth: number;
    targetAmount: number | null;
  } | null>(null);
  const [editAgeInput, setEditAgeInput] = useState('');
  const [editMonthInput, setEditMonthInput] = useState('');
  const [editTargetAmountInput, setEditTargetAmountInput] = useState('');

  const { isPro } = useSubscription();
  const { profile, createProfile, updateProfile } = useUserProfile();
  const {
    notificationEnabled,
    notificationDay,
    notificationHour,
    updateNotificationSettings,
  } = useNotifications();
  const [showNotificationPermissionModal, setShowNotificationPermissionModal] =
    useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] =
    useState(false);
  const [showNotificationScheduleModal, setShowNotificationScheduleModal] =
    useState(false);
  const [tempNotificationDay, setTempNotificationDay] =
    useState(notificationDay);
  const [tempNotificationHour, setTempNotificationHour] =
    useState(notificationHour);

  // 年齢と月齢を計算
  const ageAndMonth = useMemo(() => {
    if (!profile?.birth_date) return null;

    const birthDate = new Date(profile.birth_date);
    const currentDate = new Date();

    let age = currentDate.getFullYear() - birthDate.getFullYear();
    let month = currentDate.getMonth() - birthDate.getMonth();

    // 誕生日がまだ来ていない場合は年齢を1つ減らす
    if (
      month < 0 ||
      (month === 0 && currentDate.getDate() < birthDate.getDate())
    ) {
      age--;
      month += 12;
    }

    // 日付がまだ来ていない場合は月数を1つ減らす
    if (currentDate.getDate() < birthDate.getDate()) {
      month--;
      if (month < 0) {
        month += 12;
        age--;
      }
    }

    return { age, month };
  }, [profile?.birth_date]);

  // 年齢ベース計算のhookを追加
  const {
    ages,
    removeAge,
    updateAge,
    isLoading: agesLoading,
    error: agesError,
  } = useCalculationAges();
  const params = useLocalSearchParams<{ openBudgetModal?: string }>();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading]);

  // URLパラメータで予算設定画面を開く
  React.useEffect(() => {
    if (params.openBudgetModal === 'true') {
      router.push('/budget');
      // パラメータをクリア（次回開いた時に自動で開かないように）
      router.setParams({ openBudgetModal: undefined });
    }
  }, [params.openBudgetModal]);

  // アプリがアクティブになった時に通知許可状態を再確認
  // iOSがOFF（denied）の場合のみ、アプリ側もOFFにする
  // iOSがON（granted）でアプリ側がOFFの場合は、ユーザーが意図的にOFFにした可能性があるため同期しない
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          const status = await getNotificationStatus();
          if (status === 'denied' && notificationEnabled) {
            // iOSがOFFでアプリ側がONの場合のみ、アプリ側をOFFにする
            await updateNotificationSettings(
              false,
              notificationDay,
              notificationHour
            );
          }
          // iOSがONでアプリ側がOFFの場合は同期しない（ユーザーが意図的にOFFにした可能性がある）
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [
    notificationEnabled,
    notificationDay,
    notificationHour,
    updateNotificationSettings,
  ]);

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      {
        text: 'キャンセル',
        style: 'cancel',
      },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          const { wasAnonymous } = await signOut();
          // 匿名ユーザーがログアウトした場合はウェルカム画面、本番ユーザーがログアウトした場合はログイン画面に遷移
          if (wasAnonymous) {
            router.replace('/onboarding');
          } else {
          router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user?.id) {
        Alert.alert('エラー', 'ユーザー情報が見つかりません。');
        return;
      }

      // UID起点での完全削除を実行
      const { data, error } = await supabase.rpc(
        'delete_user_data_completely',
        {
          user_uuid: user.id,
        }
      );

      if (error) {
        console.error('データ削除エラー:', error);
        throw new Error(`データ削除に失敗しました: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'データ削除に失敗しました');
      }

      // クライアント側の認証状態をクリア
      await supabase.auth.signOut();

      // 削除成功
      Alert.alert(
        'アカウント削除完了',
        `アカウントと関連データが正常に削除されました。\n\n削除されたデータ:\n・合計: ${
          data.total_deleted
        }件\n・テーブル数: ${Object.keys(data.tables_affected).length}個`,
        [
          {
            text: 'OK',
            onPress: () => {
              setDeleteModalVisible(false);
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: unknown) {
      console.error('アカウント削除エラー:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'アカウントの削除に失敗しました。';
      Alert.alert('エラー', errorMessage);
    }
  };

  const showDeleteConfirmation = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    Alert.alert(
      '⚠️ 最終確認',
      'この操作は取り消せません。\n\n・すべてのデータが削除されます\n・アカウントは完全に消去されます\n・この操作は元に戻せません\n\n本当にアカウントを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ]
    );
  };

  const handleRemoveYear = async (
    id: string,
    targetAge: number,
    targetMonth: number
  ) => {
    // 最低1つ制限のチェック
    if (ages.length <= 1) {
      Alert.alert(
        '削除できません',
        '目標設定は最低1つ必要です。最後の目標設定は削除できません。',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      '目標設定を削除',
      `${targetAge}歳${targetMonth}ヶ月の設定を削除しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAge(id);
              Alert.alert('成功', '目標設定を削除しました');
            } catch (error) {
              Alert.alert(
                'エラー',
                error instanceof Error
                  ? error.message
                  : '年齢設定の削除に失敗しました'
              );
            }
          },
        },
      ]
    );
  };

  const handleEditTarget = (
    id: string,
    targetAge: number,
    targetMonth: number,
    targetAmount: number | null
  ) => {
    const safeTargetAge = targetAge ?? 65;
    const safeTargetMonth = targetMonth ?? 0;

    setEditingTarget({
      id,
      targetAge: safeTargetAge,
      targetMonth: safeTargetMonth,
      targetAmount,
    });
    setEditAgeInput(safeTargetAge.toString());
    setEditMonthInput(safeTargetMonth.toString());
    setEditTargetAmountInput(
      targetAmount ? (targetAmount / 10000).toString() : ''
    );
  };

  const handleSaveTarget = async () => {
    if (!editingTarget) return;

    const ageNumber = parseInt(editAgeInput);
    const monthNumber = parseInt(editMonthInput);
    const amountNumber = editTargetAmountInput
      ? parseFloat(editTargetAmountInput) * 10000
      : null;

    if (isNaN(ageNumber) || ageNumber < 20 || ageNumber > 69) {
      Alert.alert('エラー', '有効な年齢（20-69歳）を入力してください');
      return;
    }

    if (isNaN(monthNumber) || monthNumber < 0 || monthNumber > 11) {
      Alert.alert('エラー', '有効な月（0-11ヶ月）を入力してください');
      return;
    }

    if (editTargetAmountInput && (isNaN(amountNumber!) || amountNumber! < 0)) {
      Alert.alert('エラー', '有効な目標額を入力してください');
      return;
    }

    try {
      await updateAge(editingTarget.id, ageNumber, monthNumber, amountNumber);
      setEditingTarget(null);
      setEditAgeInput('');
      setEditMonthInput('');
      setEditTargetAmountInput('');
      Alert.alert(
        '成功',
        `${ageNumber}歳${monthNumber}ヶ月${
          amountNumber ? `で${(amountNumber / 10000).toFixed(0)}万円` : ''
        }に更新しました`
      );
    } catch (error) {
      Alert.alert(
        'エラー',
        error instanceof Error ? error.message : '目標設定の更新に失敗しました'
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingTarget(null);
    setEditAgeInput('');
    setEditMonthInput('');
    setEditTargetAmountInput('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* プロフィールカード */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => setBirthDateModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <User size={32} color={Colors.semantic.button.primary} />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userPrimaryInfo}>
              <Text style={styles.userName}>
                {profile?.name || 'ユーザー'}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            {(ageAndMonth || profile?.birth_date) && (
              <View style={styles.userSecondaryInfo}>
                {ageAndMonth && (
                  <Text style={styles.userAge}>
                    {ageAndMonth.age}歳{ageAndMonth.month}ヶ月
                  </Text>
                )}
                {profile?.birth_date && (
                  <Text style={styles.userBirthDate}>
                    {new Date(profile.birth_date).getFullYear()}年
                    {new Date(profile.birth_date).getMonth() + 1}月
                    {new Date(profile.birth_date).getDate()}日
                  </Text>
                )}
              </View>
            )}
          </View>
          <ChevronRight size={20} color={Colors.semantic.text.tertiary} />
        </TouchableOpacity>

        {/* 通知設定セクション */}
        <SettingSection title="通知設定">
          <View style={styles.settingItem}>
            <View
              style={[
                styles.settingIconContainer,
                !notificationEnabled && styles.settingIconContainerDisabled,
              ]}
            >
              <Bell
                size={20}
                color={
                  notificationEnabled
                    ? Colors.primary[600]
                    : Colors.semantic.text.tertiary
                }
              />
            </View>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>通知を有効にする</Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={async (value) => {
                if (value) {
                  // 通知をONにする場合、iOSの通知状態を確認
                  const permissionStatus = await getNotificationStatus();
                  if (permissionStatus === 'undetermined') {
                    // 未決定の場合: カスタムモーダル → iOS公式アラート
                    setShowNotificationPermissionModal(true);
                    return;
                  } else if (permissionStatus === 'denied') {
                    // iOSがOFFの場合: アプリ側の設定をONにする（DBに保存）
                    // ユーザーがiOSの設定だけして満足して忘れても、アプリ側の設定はONになっている
                    await updateProfile({
                      notification_enabled: true,
                      notification_day: notificationDay,
                      notification_hour: notificationHour,
                    });
                    // 設定アプリへの誘導モーダルを表示
                    setShowNotificationSettingsModal(true);
                    return;
                  }
                  // iOSがONの場合: そのまま通知を有効化
                  await updateNotificationSettings(
                    true,
                    notificationDay,
                    notificationHour
                  );
                } else {
                  // 通知をOFFにする場合: 許可チェック不要、すぐにOFFにする
                  await updateNotificationSettings(
                    false,
                    notificationDay,
                    notificationHour
                  );
                }
              }}
              trackColor={{
                false: Colors.semantic.border,
                true: Colors.primary[200],
              }}
              thumbColor={
                notificationEnabled
                  ? Colors.primary[600]
                  : Colors.semantic.text.tertiary
              }
            />
          </View>
          {notificationEnabled && (
            <View style={styles.notificationSubSection}>
              <TouchableOpacity
                style={styles.settingSubItem}
                onPress={() => {
                  setTempNotificationDay(notificationDay);
                  setTempNotificationHour(notificationHour);
                  setShowNotificationScheduleModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingSubIconContainer}>
                  <Calendar size={16} color={Colors.semantic.text.secondary} />
                </View>
                <View style={styles.settingSubLabelContainer}>
                  <Text style={styles.settingSubLabel}>通知スケジュール</Text>
                  <Text style={styles.settingSubDescription}>
                    毎月
                    {notificationDay === -1 ? '月末' : `${notificationDay}日`}の
                    {notificationHour}時
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.semantic.text.tertiary} />
              </TouchableOpacity>
            </View>
          )}
        </SettingSection>

        {/* シミュレーション設定セクション */}
        <SettingSection title="シミュレーション">
          <SettingItem
            icon={Target}
            label="目標設定"
            onPress={() => setSettingsModalVisible(true)}
          />
          <SettingItem
            icon={Wallet}
            label="予算設定"
            onPress={() => {
              router.push('/budget');
            }}
          />
        </SettingSection>

        {/* アカウントセクション */}
        <SettingSection title="アカウント">
          <SettingItem
            icon={LogOut}
            label="ログアウト"
            onPress={handleSignOut}
            isDestructive
            showChevron={false}
          />
          <SettingItem
            icon={Trash2}
            label="アカウント削除"
            onPress={showDeleteConfirmation}
            isDestructive
            showChevron={false}
          />
        </SettingSection>

        {/* 開発用セクション（本番ビルドには含まれない） */}
        {__DEV__ && (
          <SettingSection title="開発用">
            <SettingItem
              icon={RotateCcw}
              label="オンボーディングをリセット"
              onPress={async () => {
                Alert.alert(
                  'オンボーディングをリセット',
                  'onboarding_completed を false に戻します。アプリを再起動するとオンボーディングが表示されます。',
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    {
                      text: 'リセット',
                      style: 'destructive',
                      onPress: async () => {
                        if (!user?.id) return;
                        await supabase
                          .from('user_profiles')
                          .update({ onboarding_completed: false })
                          .eq('user_id', user.id);
                        Alert.alert('完了', 'アプリを再起動してください。');
                      },
                    },
                  ]
                );
              }}
              showChevron={false}
            />
          </SettingSection>
        )}
      </ScrollView>

      {/* アカウント削除確認モーダル */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={32} color={Colors.accent.error[600]} />
              </View>
              <Text style={styles.modalTitle}>アカウント削除</Text>
              <Text style={styles.modalSubtitle}>この操作は取り消せません</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.warningText}>
                アカウントを削除すると以下のデータが完全に削除されます：
              </Text>
              <View style={styles.warningList}>
                <Text style={styles.warningListItem}>• すべての資産データ</Text>
                <Text style={styles.warningListItem}>• 計算記録</Text>
                <Text style={styles.warningListItem}>• アカウント情報</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>削除する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 年数設定モーダル */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.settingsModalContainer}>
          <View style={styles.settingsModalHeader}>
            <Text style={styles.settingsModalTitle}>目標設定</Text>
            <TouchableOpacity
              style={styles.settingsModalCloseButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <X size={24} color={Colors.semantic.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsModalContent}>
            {/* 説明セクション */}
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText}>
                いつまでにいくら貯めたいか、目標年齢と目標額を設定しましょう。
              </Text>
            </View>

            {/* 目標設定一覧 */}
            <View style={styles.yearsSection}>
              <Text style={styles.yearsSectionTitle}>設定中の目標</Text>
              {agesLoading ? (
                <Text style={styles.loadingText}>読み込み中...</Text>
              ) : agesError ? (
                <Text style={styles.errorText}>{agesError}</Text>
              ) : (
                <View style={styles.yearsList}>
                  {ages.map((age) => (
                    <View key={age.id}>
                      {editingTarget?.id === age.id ? (
                        // 編集モード
                        <View style={styles.editModeContainer}>
                          <View style={styles.editInputsRow}>
                            <TextInput
                              style={styles.editYearInput}
                              value={editAgeInput}
                              onChangeText={setEditAgeInput}
                              keyboardType="numeric"
                              maxLength={2}
                              autoFocus
                            />
                            <Text style={styles.editYearSuffix}>歳</Text>
                            <TextInput
                              style={styles.editYearInput}
                              value={editMonthInput}
                              onChangeText={setEditMonthInput}
                              keyboardType="numeric"
                              maxLength={2}
                            />
                            <Text style={styles.editYearSuffix}>ヶ月で</Text>
                            <TextInput
                              style={styles.editTargetAmountInput}
                              value={editTargetAmountInput}
                              onChangeText={setEditTargetAmountInput}
                              keyboardType="numeric"
                              placeholder="目標額"
                            />
                            <Text style={styles.editTargetAmountSuffix}>
                              万円
                            </Text>
                          </View>
                          <View style={styles.editActions}>
                            <TouchableOpacity
                              style={styles.cancelTextButton}
                              onPress={handleCancelEdit}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.cancelTextButtonText}>
                                キャンセル
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.saveTextButton}
                              onPress={handleSaveTarget}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.saveTextButtonText}>
                                保存
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        // 通常表示モード
                        <ConfigListItem
                          label={`${age.target_age ?? 65}歳${
                            age.target_month !== null &&
                            age.target_month !== undefined
                              ? `${age.target_month}ヶ月`
                              : '0ヶ月'
                          }`}
                          value={
                            age.target_amount && age.target_amount > 0
                              ? `で${(age.target_amount / 10000).toFixed(
                                  0
                                )}万円`
                              : undefined
                          }
                          onEdit={() =>
                            handleEditTarget(
                              age.id,
                              age.target_age ?? 65,
                              age.target_month ?? 0,
                              age.target_amount ?? null
                            )
                          }
                          onDelete={() =>
                            handleRemoveYear(
                              age.id,
                              age.target_age ?? 65,
                              age.target_month ?? 0
                            )
                          }
                          showDelete={ages.length > 1}
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 生年月日設定モーダル */}
      <BirthDateModal
        visible={birthDateModalVisible}
        onClose={() => setBirthDateModalVisible(false)}
        onSave={async (data) => {
          try {
            if (profile) {
              await updateProfile(data);
            } else {
              await createProfile(data);
            }
            Alert.alert('成功', '生年月日を保存しました');
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : '生年月日の保存に失敗しました';
            Alert.alert('エラー', errorMessage);
          }
        }}
        currentBirthDate={profile?.birth_date}
      />

      {/* サブスクリプションモーダル */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => {
          setSubscriptionModalVisible(false);
          // サブスクリプションモーダルを閉じた後、年数設定モーダルを再開
          setTimeout(() => {
            setSettingsModalVisible(true);
          }, 100);
        }}
        onUpgrade={() => {
          Alert.alert('開発中', 'この機能は現在開発中です。', [
            {
              text: 'OK',
              onPress: () => {
                setSubscriptionModalVisible(false);
                // アラート後、年数設定モーダルを再開
                setTimeout(() => {
                  setSettingsModalVisible(true);
                }, 100);
              },
            },
          ]);
        }}
      />

      {/* 通知許可モーダル */}
      <NotificationPermissionModal
        visible={showNotificationPermissionModal}
        onAllow={async () => {
          const permissionStatus = await requestNotificationPermission();
          if (permissionStatus === 'granted') {
            // 許可された場合、通知を有効化
            const success = await updateNotificationSettings(
              true,
              notificationDay,
              notificationHour
            );
            if (!success) {
              Alert.alert('エラー', '通知設定の更新に失敗しました');
                                  }
          } else if (permissionStatus === 'denied') {
            // 拒否された場合、設定アプリへの誘導を提案
            Alert.alert(
              '通知が拒否されました',
              '通知を有効にするには、設定アプリで通知を許可してください。',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '設定を開く',
                  onPress: () => openNotificationSettings(),
                },
              ]
            );
          }
          setShowNotificationPermissionModal(false);
        }}
        onSkip={() => {
          setShowNotificationPermissionModal(false);
        }}
                      />

      {/* 設定アプリ誘導モーダル */}
      <NotificationSettingsModal
        visible={showNotificationSettingsModal}
        onOpenSettings={async () => {
          setShowNotificationSettingsModal(false);
          await openNotificationSettings();
        }}
        onCancel={() => {
          setShowNotificationSettingsModal(false);
                          }}
                        />

      {/* 通知スケジュール一括設定モーダル */}
      <Modal
        visible={showNotificationScheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          // モーダルを閉じる際に、一時的な値を元に戻す
          setTempNotificationDay(notificationDay);
          setTempNotificationHour(notificationHour);
          setShowNotificationScheduleModal(false);
        }}
                              >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>通知スケジュール</Text>
                <Text style={styles.modalSubtitle}>
                  毎月の通知日と通知時間を設定してください
                                    </Text>
                                  </View>
                                <TouchableOpacity
                          onPress={() => {
                  setTempNotificationDay(notificationDay);
                  setTempNotificationHour(notificationHour);
                  setShowNotificationScheduleModal(false);
                          }}
                style={styles.modalCloseButton}
                        >
                <X size={24} color={Colors.semantic.text.primary} />
                        </TouchableOpacity>
                  </View>
            <View style={styles.notificationPickerContainer}>
              {/* 通知日picker */}
              <View style={styles.notificationPickerWrapper}>
                <Text style={styles.notificationPickerLabel}>毎月の通知日</Text>
                <Picker
                  selectedValue={tempNotificationDay}
                  onValueChange={(value) => {
                    setTempNotificationDay(value);
                  }}
                  style={styles.notificationPicker}
                  itemStyle={styles.notificationPickerItem}
                >
                  <Picker.Item label="月末" value={-1} />
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <Picker.Item key={day} label={`${day}日`} value={day} />
                  ))}
                </Picker>
                  </View>

              {/* 通知時間picker */}
              <View style={styles.notificationPickerWrapper}>
                <Text style={styles.notificationPickerLabel}>通知時間</Text>
                <Picker
                  selectedValue={tempNotificationHour}
                  onValueChange={(value) => {
                    setTempNotificationHour(value);
                  }}
                  style={styles.notificationPicker}
                  itemStyle={styles.notificationPickerItem}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <Picker.Item key={hour} label={`${hour}時`} value={hour} />
                  ))}
                </Picker>
                                </View>
                    </View>
            <View style={styles.modalFooter}>
                            <TouchableOpacity
                style={styles.modalSaveButton}
                              onPress={() => {
                  updateNotificationSettings(
                    notificationEnabled,
                    tempNotificationDay,
                    tempNotificationHour
                  );
                  setShowNotificationScheduleModal(false);
                              }}
                activeOpacity={0.8}
                            >
                <Text style={styles.modalSaveButtonText}>完了</Text>
                            </TouchableOpacity>
                          </View>
                  </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // プロフィールカード
  profileCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
    gap: 8,
  },
  userPrimaryInfo: {
    gap: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.semantic.text.tertiary,
    lineHeight: 18,
  },
  userSecondaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  userAge: {
    fontSize: 13,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  userBirthDate: {
    fontSize: 13,
    color: Colors.semantic.text.tertiary,
  },

  // セクションスタイル
  sectionContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.semantic.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  // 最後のアイテムのボーダーを消すためのスタイル（実装上はViewのoverflow:hiddenで対応）
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconContainerDisabled: {
    backgroundColor: Colors.semantic.border,
  },
  destructiveIconContainer: {
    backgroundColor: Colors.accent.error[50],
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    fontWeight: '500',
  },
  destructiveLabel: {
    color: Colors.accent.error[600],
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  settingValuePrefix: {
    fontSize: 11,
    color: Colors.semantic.text.tertiary,
    fontWeight: '400',
  },
  settingValue: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },

  // 通知設定のサブセクション
  notificationSubSection: {
    backgroundColor: Colors.base.gray50,
    paddingTop: 8,
  },
  // サブアイテム（通知日、通知時間）
  settingSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 60, // インデント（メインアイテムのアイコン位置に合わせる）
    backgroundColor: Colors.base.gray50,
  },
  settingSubItemLast: {
    borderBottomWidth: 0,
  },
  settingSubIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.semantic.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingSubLabelContainer: {
    flex: 1,
  },
  settingSubLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    fontWeight: '400',
  },
  settingSubDescription: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
    marginTop: 2,
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primary[50],
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  modalOptionTextSelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  // 通知スケジュールモーダル用スタイル
  scheduleSection: {
    paddingTop: 8,
  },
  scheduleSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.base.gray50,
  },
  // 通知スケジュールpicker用スタイル
  notificationPickerContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  notificationPickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  notificationPickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
    marginBottom: 12,
  },
  notificationPicker: {
    width: '100%',
    height: 180,
  },
  notificationPickerItem: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  modalSaveButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent.error[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.semantic.text.tertiary,
    lineHeight: 18,
  },
  modalBody: {
    padding: 24,
  },
  warningText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    marginBottom: 16,
    fontWeight: '500',
  },
  warningList: {
    marginBottom: 0,
    paddingLeft: 8,
  },
  warningListItem: {
    fontSize: 14,
    color: Colors.accent.error[600],
    marginBottom: 8,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  cancelButtonText: {
    color: Colors.semantic.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: Colors.accent.error[600],
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '700',
  },

  // 年数設定モーダル
  settingsModalContainer: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  settingsModalCloseButton: {
    padding: 4,
  },
  settingsModalContent: {
    flex: 1,
    padding: 20,
  },

  // 説明セクション
  descriptionSection: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    lineHeight: 20,
  },

  // 年数設定セクション
  yearsSection: {
    marginBottom: 24,
  },
  yearsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 12,
  },
  yearsList: {
    gap: 8,
  },
  // Config List Item Styles
  configListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  configListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  configListItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.text.primary,
  },
  configListItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  configListItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configActionButton: {
    padding: 4,
  },

  // カードデザインのスタイル
  periodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  periodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  periodTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodDeleteButton: {
    padding: 4,
  },
  periodCardContent: {
    gap: 8,
  },
  periodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  periodDateRange: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
  },
  periodAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  periodAmountLabel: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  periodAmountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  periodDetailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    gap: 4,
  },
  periodDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodDetailLabel: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  periodDetailValue: {
    fontSize: 12,
    color: Colors.semantic.text.primary,
    fontWeight: '500',
  },
  editYearButton: {
    padding: 4,
  },
  removeYearButton: {
    padding: 4,
  },

  // 年数追加セクション
  addYearSection: {
    marginBottom: 24,
  },
  // 目標額設定セクション
  targetAmountSection: {
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  targetAmountSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  targetAmountSectionDescription: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  targetAmountList: {
    gap: 12,
  },
  addYearSectionHeader: {
    marginBottom: 12,
  },
  addYearTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addYearSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 12,
  },
  addYearButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addYearButtonText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  addYearButtonTextDisabled: {
    color: Colors.semantic.text.tertiary,
  },

  // Proバッジ
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  proBadgeText: {
    fontSize: 12,
    color: Colors.primary[600],
    fontWeight: '600',
  },

  // 無効化されたボタン
  addYearButtonDisabled: {
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },

  // 年数選択モーダル
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalContent: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  pickerModalCloseButton: {
    padding: 4,
  },
  pickerContainer: {
    padding: 20,
    maxHeight: 300,
  },
  yearScrollView: {
    maxHeight: 200,
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  yearOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  yearOptionText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  yearOptionTextSelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  yearOptionCheck: {
    fontSize: 16,
    color: Colors.primary[600],
    fontWeight: 'bold',
  },
  targetAmountInputSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  targetAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  targetAmountInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  targetAmountInputSuffix: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    marginLeft: 8,
  },
  pickerModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  pickerCancelButton: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  pickerCancelButtonText: {
    color: Colors.semantic.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerConfirmButtonText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '600',
  },

  // その他
  loadingText: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.accent.error[600],
    textAlign: 'center',
    padding: 20,
  },
  // Picker styles
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerScrollView: {
    maxHeight: 150,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primary[50],
  },
  pickerOptionText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    fontWeight: '700',
    color: Colors.primary[600],
  },
  // フォーム用スタイル
  formCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.base.gray100,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: Colors.semantic.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  formGroup: {
    marginBottom: 20,
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  formInputDisabled: {
    backgroundColor: Colors.base.gray100,
    opacity: 0.6,
  },
  assetSelector: {
    maxHeight: 180,
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
  },
  addButtonContainer: {
    marginTop: 12,
  },
  proLimitBanner: {
    backgroundColor: Colors.base.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary[300],
  },
  proLimitText: {
    fontSize: 14,
    color: Colors.semantic.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  proLimitButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  proLimitButtonText: {
    fontSize: 16,
    color: Colors.semantic.surface,
    fontWeight: '600',
  },
  formInputButton: {
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formInputButtonText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  datePickerContainer: {
    marginTop: 8,
    backgroundColor: Colors.base.gray50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  datePickerCloseButton: {
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    backgroundColor: Colors.semantic.surface,
  },
  datePickerCloseButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  // 編集モード用スタイル
  editYearInput: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.primary[300],
    fontSize: 16,
    color: Colors.semantic.text.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  editYearSuffix: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  cancelTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelTextButtonText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  saveTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary[600],
    borderRadius: 8,
  },
  saveTextButtonText: {
    fontSize: 16,
    color: Colors.semantic.surface,
    fontWeight: '600',
  },
  editModeContainer: {
    width: '100%',
  },
  editInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  editTargetAmountInput: {
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.primary[300],
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
  },
  editTargetAmountSuffix: {
    fontSize: 14,
    color: Colors.semantic.text.primary,
    fontWeight: '500',
  },
  editTargetAmountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  editPeriodNameInput: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: Colors.primary[300],
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: Colors.semantic.text.primary,
  },
  editPeriodAmountInput: {
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.primary[300],
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
  },
  editPeriodRateInput: {
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.primary[300],
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
  },
  editPeriodDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editPeriodDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.primary[300],
    borderRadius: 6,
    padding: 8,
    backgroundColor: Colors.semantic.surface,
  },
  editPeriodDateButtonText: {
    fontSize: 14,
    color: Colors.semantic.text.primary,
  },

  periodCard: {
    flexDirection: 'row',
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.semantic.surface,
  },
  cardMainContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  cardAmountUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
    marginLeft: 4,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
  },
  cardAssetInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
  },
  cardAssetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardAssetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
    backgroundColor: Colors.base.gray50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardAssetValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAssetText: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  cardAssetMissingText: {
    fontSize: 12,
    color: Colors.accent.error[600],
    fontWeight: '600',
  },
});
