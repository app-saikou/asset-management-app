import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import {
  useMultipleAssets,
  Asset,
  AssetType,
} from '../../hooks/useMultipleAssets';
import { useAssetHistory } from '../../hooks/useAssetHistory';
import TotalAssetCard from '../../components/TotalAssetCard';
import AssetSectionCard from '../../components/AssetSectionCard';
import AddAssetCard from '../../components/AddAssetCard';
import InventoryButton from '../../components/InventoryButton';
import CalculationResultModal from '../../components/CalculationResultModal';
import AddAssetModal from '../../components/AddAssetModal';
import FloatingActionButton from '../../components/FloatingActionButton';
import { InventoryAdjustmentModal } from '../../components/InventoryAdjustmentModal';

interface CalculationResult {
  currentAssets: number;
  futureValue: number;
  annualRate: number;
  years: number;
  increaseAmount: number;
}

export default function AssetsScreen() {
  const {
    groupedAssets,
    totalAssets,
    loading,
    error,
    addAsset,
    deleteAsset,
    formatNumber,
    getAssetTypeIcon,
    getAssetTypeName,
    fetchAssets,
  } = useMultipleAssets();

  const { saveHistory } = useAssetHistory();

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

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
    console.log('🔄 調整モーダル終了 - 資産を再取得...');
    await fetchAssets();
    console.log('✅ 調整後の資産取得完了');
  };

  // 棚卸し計算ロジック
  const handleInventoryCalculation = async () => {
    if (totalAssets <= 0) {
      Alert.alert(
        'エラー',
        '資産が登録されていません。まず資産を追加してください。'
      );
      return;
    }

    if (totalAssets > 999999999999) {
      Alert.alert('エラー', '資産額が大きすぎます（上限: 999兆円）');
      return;
    }

    setCalculating(true);

    try {
      // 固定値での計算（Phase 1）
      const annualRate = 5; // 5%
      const years = 10; // 10年

      // Formula: future_value = current_assets * (1 + rate) ^ years
      const futureValue = Math.round(
        totalAssets * Math.pow(1 + annualRate / 100, years)
      );
      const increaseAmount = Math.round(futureValue - totalAssets);

      // 結果の検証
      if (isNaN(futureValue) || !isFinite(futureValue) || futureValue < 0) {
        Alert.alert('エラー', '計算結果が無効です');
        return;
      }

      // 履歴に保存
      await saveHistory(totalAssets, annualRate, years, futureValue);

      // 結果を設定
      const result: CalculationResult = {
        currentAssets: totalAssets,
        futureValue,
        annualRate,
        years,
        increaseAmount,
      };

      setCalculationResult(result);
      // 計算結果モーダルをスキップして直接調整モーダルを開く
      setShowAdjustmentModal(true);
    } catch (error) {
      console.error('棚卸し計算エラー:', error);
      Alert.alert('エラー', '計算中にエラーが発生しました');
    } finally {
      setCalculating(false);
    }
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
  };

  const handleSaveAsset = async (
    type: AssetType,
    name: string,
    amount: number,
    annualRate: number,
    memo?: string
  ) => {
    try {
      await addAsset(type, name, amount, annualRate, memo);
    } catch (error) {
      // エラーはaddAsset内でハンドリングされる
      throw error;
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    // TODO: 編集モーダルを開く
    Alert.alert('開発中', '資産編集機能は開発中です');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hasAssets && (
          <>
            <TotalAssetCard
              totalAssets={totalAssets}
              formatNumber={formatNumber}
            />
            <InventoryButton
              onPress={handleInventoryCalculation}
              disabled={calculating}
              loading={calculating}
            />
          </>
        )}

        {hasAssets ? (
          <>
            <AssetSectionCard
              type="cash"
              assets={groupedAssets.cash}
              totalAmount={getCategoryTotal(groupedAssets.cash)}
              formatNumber={formatNumber}
              getAssetTypeIcon={getAssetTypeIcon}
              getAssetTypeName={getAssetTypeName}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAsset}
            />

            <AssetSectionCard
              type="stock"
              assets={groupedAssets.stock}
              totalAmount={getCategoryTotal(groupedAssets.stock)}
              formatNumber={formatNumber}
              getAssetTypeIcon={getAssetTypeIcon}
              getAssetTypeName={getAssetTypeName}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <TrendingUp size={64} color={Colors.semantic.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>資産を登録しましょう</Text>
            <Text style={styles.emptySubtitle}>
              現金や株式などの資産を登録して{'\n'}
              総資産を管理しましょう
            </Text>
            <Text style={styles.emptyHint}>
              右下の「資産を追加」ボタンから始めてください
            </Text>
          </View>
        )}
      </ScrollView>

      <CalculationResultModal
        visible={showResultModal}
        result={calculationResult}
        onClose={handleCloseResultModal}
        formatNumber={formatNumber}
        onAdjust={handleOpenAdjustment}
      />

      <AddAssetModal
        visible={showAddModal}
        onClose={handleCloseAddModal}
        onSave={handleSaveAsset}
      />

      <InventoryAdjustmentModal
        visible={showAdjustmentModal}
        onClose={handleCloseAdjustment}
        currentAssets={[...groupedAssets.cash, ...groupedAssets.stock]}
        totalAssets={totalAssets}
        years={10}
      />

      <FloatingActionButton onPress={handleAddAsset} disabled={loading} />
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
    paddingBottom: 40,
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
  emptyHint: {
    fontSize: 14,
    color: Colors.semantic.button.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
