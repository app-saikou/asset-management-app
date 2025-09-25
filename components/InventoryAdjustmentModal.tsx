import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { X, Save } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useAssetHistory } from '../hooks/useAssetHistory';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useInterstitialAdDisplay } from './InterstitialAd';

interface Asset {
  id: string;
  type: 'cash' | 'stock';
  name: string;
  amount: number;
  annual_rate: number;
}

interface AdjustedAsset extends Asset {
  adjustedAmount: number;
  difference: number;
  differencePercentage: number;
}

interface InventoryAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  currentAssets: Asset[];
  years?: number;
}

export const InventoryAdjustmentModal: React.FC<
  InventoryAdjustmentModalProps
> = ({ visible, onClose, currentAssets, years = 10 }) => {
  const [adjustedAssets, setAdjustedAssets] = useState<AdjustedAsset[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { saveHistory } = useAssetHistory();
  const { user } = useAuth();
  const { showInterstitialAd } = useInterstitialAdDisplay();

  // 初期化
  useEffect(() => {
    if (visible && currentAssets.length > 0) {
      const initialAdjusted = currentAssets.map((asset) => ({
        ...asset,
        adjustedAmount: asset.amount,
        difference: 0,
        differencePercentage: 0,
      }));
      setAdjustedAssets(initialAdjusted);
      setHasChanges(false);
    }
  }, [visible, currentAssets]);

  // モーダルが開いた時の広告表示は削除（保存時に表示するため）

  // 各資産の将来価値を計算
  const calculateAssetFutureValue = (amount: number, annualRate: number) => {
    return Math.round(amount * Math.pow(1 + annualRate / 100, years));
  };

  // 差額を計算
  const calculateDifference = (newAmount: number, originalAmount: number) => {
    const difference = newAmount - originalAmount;
    const percentage =
      originalAmount > 0 ? (difference / originalAmount) * 100 : 0;
    return {
      difference,
      differencePercentage: percentage,
    };
  };

  // 金額調整
  const handleAmountChange = (assetId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const amount = numericValue === '' ? 0 : parseInt(numericValue, 10);

    setAdjustedAssets((prev) =>
      prev.map((asset) => {
        if (asset.id === assetId) {
          const { difference, differencePercentage } = calculateDifference(
            amount,
            asset.amount
          );
          return {
            ...asset,
            adjustedAmount: amount,
            difference,
            differencePercentage,
          };
        }
        return asset;
      })
    );

    setHasChanges(true);
  };

  // 金額フォーマット
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ja-JP');
  };

  // 合計計算
  const calculateTotals = () => {
    const originalTotal = adjustedAssets.reduce(
      (sum, asset) => sum + asset.amount,
      0
    );
    const adjustedTotal = adjustedAssets.reduce(
      (sum, asset) => sum + asset.adjustedAmount,
      0
    );
    const originalFutureValue = adjustedAssets.reduce(
      (sum, asset) =>
        sum + calculateAssetFutureValue(asset.amount, asset.annual_rate),
      0
    );
    const adjustedFutureValue = adjustedAssets.reduce(
      (sum, asset) =>
        sum +
        calculateAssetFutureValue(asset.adjustedAmount, asset.annual_rate),
      0
    );

    return {
      originalTotal,
      adjustedTotal,
      originalFutureValue,
      adjustedFutureValue,
      totalDifference: adjustedTotal - originalTotal,
      futureDifference: adjustedFutureValue - originalFutureValue,
    };
  };

  // 保存処理
  const handleSave = async () => {
    try {
      const totals = calculateTotals();

      // 各資産を並列で更新（データベースのみ）
      const updatePromises = adjustedAssets
        .filter((asset) => asset.adjustedAmount !== asset.amount)
        .map(async (asset) => {
          const { error } = await supabase
            .from('multiple_assets')
            .update({
              amount: asset.adjustedAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', asset.id)
            .eq('user_id', user?.id);

          if (error) {
            throw error;
          }
        });

      await Promise.all(updatePromises);
      console.log('✅ 棚卸し調整のDB更新完了');

      // 履歴に保存（調整後の値で、資産詳細も含む）
      const assetDetails = adjustedAssets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        originalAmount: asset.amount,
        adjustedAmount: asset.adjustedAmount,
        annualRate: asset.annual_rate,
      }));

      await saveHistory(
        totals.adjustedTotal,
        // 加重平均年利率を計算
        adjustedAssets.reduce(
          (sum, asset) => sum + asset.annual_rate * asset.adjustedAmount,
          0
        ) / totals.adjustedTotal,
        years,
        totals.adjustedFutureValue,
        assetDetails
      );

      // インタースティシャル広告を表示（保存完了後）
      try {
        console.log('🎯 Showing interstitial ad after save...');
        console.log('📱 Modal state before ad:', { visible: true, hasChanges });

        const adShown = await showInterstitialAd(() => {
          // 広告が閉じた後に少し遅延してからアラートを表示
          setTimeout(() => {
            console.log('📱 Showing completion alert after ad closed...');
            Alert.alert(
              '棚卸し完了',
              `資産が調整されました。\n\n調整前: ${formatAmount(
                totals.originalTotal
              )}円\n調整後: ${formatAmount(totals.adjustedTotal)}円\n差額: ${
                totals.totalDifference >= 0 ? '+' : ''
              }${formatAmount(totals.totalDifference)}円`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // モーダルを閉じてから資産を再取得
                    onClose();
                  },
                },
              ]
            );
          }, 500); // 500ms遅延でモーダルの重複を防ぐ
        });

        // 広告が表示されなかった場合はすぐにアラートを表示
        if (!adShown) {
          Alert.alert(
            '棚卸し完了',
            `資産が調整されました。\n\n調整前: ${formatAmount(
              totals.originalTotal
            )}円\n調整後: ${formatAmount(totals.adjustedTotal)}円\n差額: ${
              totals.totalDifference >= 0 ? '+' : ''
            }${formatAmount(totals.totalDifference)}円`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // モーダルを閉じてから資産を再取得
                  onClose();
                },
              },
            ]
          );
        }
      } catch (error) {
        console.log('インタースティシャル広告表示エラー:', error);
        // 広告エラーでもアラートを表示
        Alert.alert(
          '棚卸し完了',
          `資産が調整されました。\n\n調整前: ${formatAmount(
            totals.originalTotal
          )}円\n調整後: ${formatAmount(totals.adjustedTotal)}円\n差額: ${
            totals.totalDifference >= 0 ? '+' : ''
          }${formatAmount(totals.totalDifference)}円`,
          [
            {
              text: 'OK',
              onPress: () => {
                // モーダルを閉じてから資産を再取得
                onClose();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('棚卸し保存エラー:', error);
      Alert.alert('エラー', '棚卸しの保存に失敗しました。');
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        '変更を破棄',
        '調整した内容が失われますが、よろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const totals = calculateTotals();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <X size={24} color={Colors.semantic.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>資産棚卸し</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* 合計表示 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>合計資産</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>調整前</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(totals.originalTotal)}円
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>調整後</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(totals.adjustedTotal)}円
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>差額</Text>
              <Text
                style={[
                  styles.summaryValue,
                  totals.totalDifference >= 0
                    ? styles.positiveText
                    : styles.negativeText,
                ]}
              >
                {totals.totalDifference >= 0 ? '+' : ''}
                {formatAmount(totals.totalDifference)}円
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.summaryTitle}>{years}年後の将来価値</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>調整前</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(totals.originalFutureValue)}円
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>調整後</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(totals.adjustedFutureValue)}円
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>差額</Text>
              <Text
                style={[
                  styles.summaryValue,
                  totals.futureDifference >= 0
                    ? styles.positiveText
                    : styles.negativeText,
                ]}
              >
                {totals.futureDifference >= 0 ? '+' : ''}
                {formatAmount(totals.futureDifference)}円
              </Text>
            </View>
          </View>

          {/* 資産リスト */}
          <View style={styles.assetsList}>
            {adjustedAssets.map((asset) => (
              <View key={asset.id} style={styles.assetCard}>
                <View style={styles.assetHeader}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetType}>
                    {asset.type === 'cash' ? '現金' : '株式'} (
                    {asset.annual_rate}%)
                  </Text>
                </View>

                <View style={styles.assetContent}>
                  <View style={styles.originalAmountSection}>
                    <Text style={styles.originalAmountLabel}>調整前の金額</Text>
                    <Text style={styles.originalAmountValue}>
                      {formatAmount(asset.amount)}円
                    </Text>
                  </View>

                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>調整後の金額</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={
                        asset.adjustedAmount === 0
                          ? ''
                          : formatAmount(asset.adjustedAmount)
                      }
                      onChangeText={(value) =>
                        handleAmountChange(asset.id, value)
                      }
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>

                  {asset.difference !== 0 && (
                    <View style={styles.differenceSection}>
                      <Text
                        style={[
                          styles.differenceText,
                          asset.difference >= 0
                            ? styles.positiveText
                            : styles.negativeText,
                        ]}
                      >
                        {asset.difference >= 0 ? '+' : ''}
                        {formatAmount(asset.difference)}円 (
                        {asset.differencePercentage >= 0 ? '+' : ''}
                        {asset.differencePercentage.toFixed(1)}%)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* 保存ボタン */}
          <View style={styles.saveSection}>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButtonBottom,
                !hasChanges && styles.saveButtonDisabled,
              ]}
              disabled={!hasChanges}
            >
              <Save
                size={20}
                color={
                  hasChanges
                    ? Colors.semantic.surface
                    : Colors.semantic.text.tertiary
                }
              />
              <Text
                style={[
                  styles.saveButtonText,
                  !hasChanges && styles.saveButtonTextDisabled,
                ]}
              >
                保存
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    backgroundColor: Colors.semantic.surface,
  },
  saveButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
  saveButtonTextDisabled: {
    color: Colors.semantic.text.tertiary,
  },
  headerSpacer: {
    width: 44, // 保存ボタンの幅と同じにしてバランスを取る
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.primary,
  },
  positiveText: {
    color: Colors.accent.success[600],
  },
  negativeText: {
    color: Colors.accent.error[600],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.semantic.border,
    marginVertical: 16,
  },
  assetsList: {
    gap: 16,
  },
  assetCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    padding: 16,
  },
  assetHeader: {
    marginBottom: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
  },
  assetType: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  assetContent: {
    gap: 12,
  },
  originalAmountSection: {
    gap: 8,
  },
  originalAmountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
  originalAmountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    backgroundColor: Colors.base.gray50,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  amountSection: {
    gap: 8,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.primary,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.semantic.background,
    color: Colors.semantic.text.primary,
  },
  differenceSection: {
    alignItems: 'flex-end',
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
