import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Plus, Banknote, BarChart3 } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import {
  useMultipleAssets,
  Asset,
  AssetType,
} from '../../hooks/useMultipleAssets';
import { useAssetHistory } from '../../hooks/useAssetHistory';
import TotalAssetCard from '../../components/TotalAssetCard';
import AssetSectionCard from '../../components/AssetSectionCard';
import CalculationResultModal from '../../components/CalculationResultModal';
import AddAssetModal from '../../components/AddAssetModal';
import SubscriptionModal from '../../components/SubscriptionModal';
import { useInterstitialAdContext } from '../../contexts/InterstitialAdContext';
import { AdBanner } from '../../components/AdBanner';
import { useSubscription, useInterestRates } from '../../hooks/useSubscription';
import { useCalculationYears } from '../../hooks/useCalculationYears';
import { calculateMultiYearResults } from '../../lib/calculationYears';
import type { MultiYearCalculationResult } from '../../types/calculationYears';
import { useUserProfile } from '../../hooks/useAgeBasedCalculation';
import { requestTrackingPermission } from '../../lib/att';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useDisplayUnit } from '../../contexts/DisplayUnitContext';
import NotificationPermissionModal from '../../components/NotificationPermissionModal';
import { requestNotificationPermissionForOnboarding } from '../../lib/notifications';
import { scheduleMonthlyNotification } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';

interface CalculationResult {
  currentAssets: number;
  futureValue: number;
  annualRate: number;
  years: number;
  increaseAmount: number;
}

export default function AssetsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const {
    assets,
    groupedAssets,
    totalAssets,
    loading,
    error,
    addAsset,
    updateAsset,
    deleteAsset,
    formatNumber,
    getAssetTypeIcon,
    fetchAssets,
  } = useMultipleAssets();

  const { saveHistory } = useAssetHistory();
  const { showInterstitialAd } = useInterstitialAdContext();
  const { isPro, canCustomizeRates, upgradeToPro } = useSubscription();
  const { rates } = useInterestRates();
  const { years: calculationYears } = useCalculationYears();


  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [multiYearResult, setMultiYearResult] =
    useState<MultiYearCalculationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [shouldShowNotificationModal, setShouldShowNotificationModal] = useState(false);
  const hasShownNotificationModalThisSessionRef = useRef(false);
  const { formatNumberDisplay: fmt } = useDisplayUnit();
  const formatNumberDisplay = useCallback((num: number) => fmt(num, formatNumber), [fmt, formatNumber]);


  // 匿名ユーザーの場合はサインアップ画面にリダイレクト
  useEffect(() => {
    if (user?.is_anonymous === true) {
      router.replace('/auth/signup');
    }
  }, [user?.is_anonymous, router]);

  // URLパラメータから通知許可モーダル表示フラグを取得（ATT完了後に表示するためフラグとして保存）
  useEffect(() => {
    if (params.showNotificationModal === 'true') {
      setShouldShowNotificationModal(true);
      // URLパラメータをクリア（再表示を防ぐため）
      setTimeout(() => {
        router.setParams({ showNotificationModal: undefined });
      }, 100);
    }
  }, [params.showNotificationModal, router]);

  // 資産画面表示時にATT許可をリクエストし、完了後に通知許可モーダルを表示
  useEffect(() => {
    const requestATTAndShowNotification = async () => {
      try {
        // 1. ATT許可をリクエスト
        await requestTrackingPermission();
        
        // 2. 少し待機（ATTダイアログが閉じるのを待つ）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. 通知許可モーダルを表示する条件
        // - URLパラメータで指定されている場合（オンボーディング完了後のサインアップ後）
        // - または、通知設定が未設定(null)の場合で、かつセッション内で未表示の場合
        // - または、ログイン後の初回ホーム画面遷移時（既存ユーザーでも表示、ただし「後で」選択済みは除外）
        if (
          shouldShowNotificationModal ||
          (!hasShownNotificationModalThisSessionRef.current &&
           user &&
           profile?.notification_enabled === null)
        ) {
          setShowNotificationModal(true);
          setShouldShowNotificationModal(false); // フラグをリセット
          hasShownNotificationModalThisSessionRef.current = true; // セッション内で表示済みフラグを設定
        }
      } catch (error) {
        console.error('❌ ATT許可エラー:', error);
      }
    };

    // 少し遅延してからATT許可をリクエスト
    const timer = setTimeout(requestATTAndShowNotification, 1000);
    return () => clearTimeout(timer);
  }, [shouldShowNotificationModal, profile?.notification_enabled, user]);

  // 調整モーダルを開く
  const handleOpenAdjustment = () => {
    setShowResultModal(false);
    setShowAdjustmentModal(true);
  };

  // 調整モーダルを閉じる
  const handleCloseAdjustment = async () => {
    setShowAdjustmentModal(false);
    setCalculationResult(null);
    // モーダルを閉じる際に資産を再取得（最新データを反映）
    await fetchAssets();
  };

  // 棚卸し完了時の処理（結果画面を表示）
  const handleInventoryComplete = () => {
    setShowResultModal(true);
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setCalculationResult(null);
  };

  const handleAddAsset = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setEditingAsset(null);
  };

  const handleSaveAsset = async (
    type: AssetType,
    name: string,
    amount: number,
    annualRate: number,
    memo?: string
  ) => {
    await addAsset(type, name, amount, annualRate, memo);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setShowAddModal(true);
  };

  const handleDeleteAsset = async (id: string) => {
    await deleteAsset(id);
  };

  // 資産種別ごとの合計金額を計算
  const getCategoryTotal = (assets: Asset[]): number => {
    return assets.reduce((total, asset) => total + asset.amount, 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.semantic.button.primary}
          />
          <Text style={styles.loadingText}>資産を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasAssets = totalAssets > 0;

  const renderSection = (type: 'cash' | 'stock') => {
    const label = type === 'cash' ? '現金' : '株式';
    const icon = type === 'cash'
      ? <Banknote size={16} color={Colors.semantic.text.secondary} />
      : <BarChart3 size={16} color={Colors.accent.warning[500]} />;
    const sectionAssets = groupedAssets[type];
    return (
      <View style={styles.section} key={type}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            {icon}
            <Text style={styles.sectionTitle}>{label}</Text>
          </View>
          <TouchableOpacity
            style={styles.sectionAddButton}
            onPress={handleAddAsset}
            activeOpacity={0.7}
          >
            <Plus size={16} color={Colors.semantic.button.primary} />
            <Text style={styles.sectionAddText}>追加</Text>
          </TouchableOpacity>
        </View>
        {sectionAssets.length > 0 ? (
          <AssetSectionCard
            assets={sectionAssets}
            formatNumber={formatNumberDisplay}
            onEditAsset={handleEditAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        ) : (
          <View style={styles.emptyTabContainer}>
            <Text style={styles.emptyTabText}>{label}資産がありません</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {hasAssets ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TotalAssetCard
            totalAssets={totalAssets}
            cashTotal={getCategoryTotal(groupedAssets.cash)}
            stockTotal={getCategoryTotal(groupedAssets.stock)}
            formatNumber={formatNumberDisplay}
            lastUpdatedAt={assets.length > 0
              ? assets.reduce((latest, a) =>
                  a.updated_at > latest ? a.updated_at : latest,
                  assets[0].updated_at)
              : undefined}
          />
          {renderSection('cash')}
          {renderSection('stock')}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <TrendingUp size={64} color={Colors.semantic.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>資産を登録しましょう</Text>
            <Text style={styles.emptySubtitle}>
              現金や株式などの資産を登録して{'\n'}
              総資産を管理しましょう
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={handleAddAsset}
              activeOpacity={0.7}
            >
              <Plus size={20} color={Colors.semantic.surface} />
              <Text style={styles.emptyAddButtonText}>資産を追加</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <CalculationResultModal
        visible={showResultModal}
        result={calculationResult}
        multiYearResult={multiYearResult}
        onClose={handleCloseResultModal}
        formatNumber={formatNumber}
        onAdjust={handleOpenAdjustment}
      />

      <AddAssetModal
        visible={showAddModal}
        onClose={handleCloseAddModal}
        onSave={handleSaveAsset}
        onUpdate={async (id, updates) => {
          await updateAsset(id, updates);
        }}
        initialAsset={editingAsset ?? undefined}
        onShowSubscriptionModal={() => {
          setShowAddModal(false); // AddAssetModalを先に閉じる
          setTimeout(() => {
            setShowSubscriptionModal(true); // 少し遅延してから開く
          }, 300);
        }}
      />

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          // サブスクリプションモーダルを閉じた後、AddAssetModalを再開
          setTimeout(() => {
            setShowAddModal(true);
          }, 100);
        }}
        onUpgrade={() => {
          Alert.alert('開発中', 'この機能は現在開発中です。', [
            {
              text: 'OK',
              onPress: () => {
                setShowSubscriptionModal(false);
                // アラート後、AddAssetModalを再開
                setTimeout(() => {
                  setShowAddModal(true);
                }, 100);
              },
            },
          ]);
        }}
      />

      {/* 通知許可モーダル（オンボーディング完了後のホーム画面遷移時に表示） */}
      <NotificationPermissionModal
        visible={showNotificationModal}
        onAllow={async () => {
          try {
            console.log('【オンボーディング通知許可】「続ける」ボタンが押されました');
            // オンボーディング後の初回リクエストでは、常にiOSダイアログを表示
            const permissionStatus = await requestNotificationPermissionForOnboarding();
            console.log('【オンボーディング通知許可】許可状態:', permissionStatus);
            
            if (permissionStatus === 'granted') {
              // 通知をスケジュールしてデータベースに保存
              const notificationId = await scheduleMonthlyNotification(-1, 9);
              if (notificationId && user?.id) {
                await supabase
                  .from('user_profiles')
                  .update({
                    notification_enabled: true,
                    notification_day: -1,
                    notification_hour: 9,
                  })
                  .eq('user_id', user.id);
              }
              setShowNotificationModal(false);
            } else if (permissionStatus === 'denied') {
              // 拒否された場合、データベースにfalseを保存
              if (user?.id) {
                await supabase
                  .from('user_profiles')
                  .update({
                    notification_enabled: false,
                    notification_day: -1,
                    notification_hour: 9,
                  })
                  .eq('user_id', user.id);
              }
              setShowNotificationModal(false);
              // オンボーディング後は設定アプリ誘導モーダルを表示しない
              // （ユーザーが明示的に拒否した場合は、後で設定画面から有効化できる）
            } else {
              // undetermined の場合も、安全のためfalseを保存（エラーケースや不明な状態）
              if (user?.id) {
                await supabase
                  .from('user_profiles')
                  .update({
                    notification_enabled: false,
                    notification_day: -1,
                    notification_hour: 9,
                  })
                  .eq('user_id', user.id);
              }
              setShowNotificationModal(false);
            }
          } catch (error) {
            console.error('通知設定エラー:', error);
            setShowNotificationModal(false);
          }
        }}
        onSkip={async () => {
          // 通知無効でデータベースに保存
          // ユーザーは後で設定画面（プロフィール画面）から通知を有効化できます
          if (user?.id) {
            await supabase
              .from('user_profiles')
              .update({
                notification_enabled: false,
                notification_day: -1,
                notification_hour: 9,
              })
              .eq('user_id', user.id);
          }
          setShowNotificationModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.accent.error[500],
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // フッターボタンとFABの高さ分の余白を追加
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    letterSpacing: 0.3,
  },
  sectionAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    backgroundColor: Colors.semantic.surface,
  },
  sectionAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.semantic.button.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.semantic.text.tertiary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 12,
    gap: 8,
    shadowColor: Colors.semantic.button.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
  emptyTabContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
  },
  emptyTabSubtext: {
    fontSize: 14,
    color: Colors.semantic.text.tertiary,
    textAlign: 'center',
  },
  footerBanner: {
    marginHorizontal: 16,
    marginBottom: 0,
    position: 'absolute',
    bottom: 0, // タブナビゲーションの上に配置
    left: 0,
    right: 0,
  },
});
