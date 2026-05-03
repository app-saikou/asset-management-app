import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wallet, TrendingUp, Info } from 'lucide-react-native';
import { HorizontalScrollPicker } from '../HorizontalScrollPicker';
import { Colors } from '../../constants/Colors';
import { useMultipleAssets } from '../../hooks/useMultipleAssets';

interface Step2Data {
  cashAsset?: { name: string; amount: number };
  stockAsset?: { name: string; amount: number };
}

interface OnboardingStep2Props {
  data: Step2Data;
  onComplete: (data: Required<Step2Data>) => void;
  currentStep?: number;
}

export interface OnboardingStep2Ref {
  getCurrentValues: () => Required<Step2Data>;
}

const OnboardingStep2 = forwardRef<OnboardingStep2Ref, OnboardingStep2Props>(
  ({ data, onComplete, currentStep }, ref) => {
    const { assets, fetchAssets } = useMultipleAssets();
    const [cashAmount, setCashAmount] = useState(3000000);
    const [stockAmount, setStockAmount] = useState(3000000);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const STEP = 200000; // 20万円刻み
    const MAX = 50000000; // 5000万円

    // 50万円単位で丸める
    const snapToStep = useCallback(
      (value: number) => Math.round(value / STEP) * STEP,
      []
    );

    // ピッカー用の値リスト
    const assetValues = useMemo(
      () => Array.from({ length: MAX / STEP + 1 }, (_, i) => i * STEP),
      []
    );

    // ステップ2になったときにデータベースから最新の値を取得
    useEffect(() => {
      if (currentStep === 2) {
        console.log(
          'ステップ2に戻ってきました。データベースから最新の値を取得します'
        );
        fetchAssets();
        // isInitializedをリセットして、最新の値を反映させる
        setIsInitialized(false);
      }
    }, [currentStep, fetchAssets]);

    // データベースから既存の資産データを取得して初期値に設定
    useEffect(() => {
      if (assets.length > 0 && !isInitialized) {
        const cashAsset = assets.find((asset) => asset.type === 'cash');
        const stockAsset = assets.find((asset) => asset.type === 'stock');

        let newCashAmount: number | undefined;
        let newStockAmount: number | undefined;

        if (cashAsset) {
          newCashAmount = snapToStep(cashAsset.amount);
          setCashAmount(newCashAmount);
        }
        if (stockAsset) {
          newStockAmount = snapToStep(stockAsset.amount);
          setStockAmount(newStockAmount);
        }

        setIsInitialized(true);

        console.log('データベースから取得した値でスライダーを更新しました', {
          現金: cashAsset?.amount,
          株式: stockAsset?.amount,
        });

        // データベースから取得した値を親に通知（現在の値ではなく、取得した値を使用）
        const finalCashAmount = newCashAmount ?? 3000000; // デフォルト値: 300万円
        const finalStockAmount = newStockAmount ?? 3000000; // デフォルト値: 300万円

        onComplete({
          cashAsset: { name: '現金', amount: finalCashAmount },
          stockAsset: { name: '株式', amount: finalStockAmount },
        });
        prevValuesRef.current = {
          cashAmount: finalCashAmount,
          stockAmount: finalStockAmount,
        };
      }
    }, [assets, snapToStep, isInitialized, onComplete]);

    // propsからの初期値設定（フォールバック、一度だけ）
    useEffect(() => {
      if (
        !isInitialized &&
        assets.length === 0 &&
        (data?.cashAsset || data?.stockAsset)
      ) {
        let finalCashAmount = 3000000; // デフォルト値: 300万円
        let finalStockAmount = 3000000; // デフォルト値: 300万円

        if (data.cashAsset?.amount !== undefined) {
          finalCashAmount = snapToStep(data.cashAsset.amount);
          setCashAmount(finalCashAmount);
        }
        if (data.stockAsset?.amount !== undefined) {
          finalStockAmount = snapToStep(data.stockAsset.amount);
          setStockAmount(finalStockAmount);
        }

        setIsInitialized(true);

        console.log(
          '初期化完了: propsから取得した値でスライダーを更新しました',
          {
            現金: data.cashAsset?.amount,
            株式: data.stockAsset?.amount,
          }
        );

        // propsから取得した値を親に通知
        onComplete({
          cashAsset: { name: '現金', amount: finalCashAmount },
          stockAsset: { name: '株式', amount: finalStockAmount },
        });
        prevValuesRef.current = {
          cashAmount: finalCashAmount,
          stockAmount: finalStockAmount,
        };
      }
    }, [data, assets, isInitialized, snapToStep, onComplete]);

    // 前回値を記録（初回通知を許可するためnull開始）
    const prevValuesRef = useRef<{
      cashAmount: number;
      stockAmount: number;
    } | null>(null);

    // 親から最新の値を取得できるようにする
    useImperativeHandle(
      ref,
      () => ({
        getCurrentValues: () => ({
          cashAsset: { name: '現金', amount: cashAmount },
          stockAsset: { name: '株式', amount: stockAmount },
        }),
      }),
      [cashAmount, stockAmount]
    );

    const formatAmount = (amount: number) => {
      if (amount >= 100000000) {
        return `${(amount / 100000000).toFixed(1)}億円`;
      } else if (amount >= 10000) {
        return `${(amount / 10000).toFixed(0)}万円`;
      } else {
        return `${amount.toLocaleString()}円`;
      }
    };

    // 現金スライダーの変更ハンドラー
    const handleCashChange = useCallback(
      (value: number) => {
        const snappedValue = snapToStep(value);
        if (snappedValue !== cashAmount) {
          setCashAmount(snappedValue);
        }
      },
      [cashAmount, snapToStep]
    );

    // 株式スライダーの変更ハンドラー
    const handleStockChange = useCallback(
      (value: number) => {
        const snappedValue = snapToStep(value);
        if (snappedValue !== stockAmount) {
          setStockAmount(snappedValue);
        }
      },
      [stockAmount, snapToStep]
    );

    // 初期化完了後、値が変わった時だけ親に通知（無限ループ防止）
    useEffect(() => {
      if (!isInitialized) return;

      const prev = prevValuesRef.current;
      const hasChanged =
        !prev ||
        prev.cashAmount !== cashAmount ||
        prev.stockAmount !== stockAmount;

      if (hasChanged) {
        console.log(
          'ステップ2: スライダーの値が変更されました。親に通知します',
          {
            現金: cashAmount,
            株式: stockAmount,
          }
        );

        onComplete({
          cashAsset: { name: '現金', amount: cashAmount },
          stockAsset: { name: '株式', amount: stockAmount },
        });
        prevValuesRef.current = { cashAmount, stockAmount };
      }
    }, [cashAmount, stockAmount, isInitialized, onComplete]);

    // ツールチップを3秒後に自動的に閉じる
    useEffect(() => {
      if (showTooltip) {
        const timer = setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [showTooltip]);

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>現在の資産はどのくらい？</Text>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>現在の資産額を教えてね</Text>
            <View style={styles.infoIconContainer}>
              <TouchableOpacity
                onPress={() => setShowTooltip(!showTooltip)}
                style={styles.infoIcon}
              >
                <Info size={16} color={Colors.semantic.text.secondary} />
              </TouchableOpacity>
              {showTooltip && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText} numberOfLines={1}>
                    資産額はあとから変更できるよ
                  </Text>
                  <View style={styles.tooltipArrowOuter} />
                  <View style={styles.tooltipArrowInner} />
                </View>
              )}
            </View>
          </View>

          {/* 現金資産 */}
          <View style={styles.assetSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <Wallet size={24} color={Colors.primary[600]} />
                </View>
                <Text style={styles.sectionTitle}>現金</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.currentAmount}>
                  {formatAmount(cashAmount)}
                </Text>
              </View>
            </View>

            <HorizontalScrollPicker
              values={assetValues}
              selectedValue={cashAmount}
              onValueChange={handleCashChange}
              formatValue={formatAmount}
            />
          </View>

          {/* 株式資産 */}
          <View style={styles.assetSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <TrendingUp size={24} color={Colors.primary[600]} />
                </View>
                <Text style={styles.sectionTitle}>株式</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.currentAmount}>
                  {formatAmount(stockAmount)}
                </Text>
              </View>
            </View>

            <HorizontalScrollPicker
              values={assetValues}
              selectedValue={stockAmount}
              onValueChange={handleStockChange}
              formatValue={formatAmount}
            />
          </View>
        </View>
      </View>
    );
  }
);

OnboardingStep2.displayName = 'OnboardingStep2';

export default OnboardingStep2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoIconContainer: {
    marginLeft: 8,
    position: 'relative',
    zIndex: 1000,
  },
  infoIcon: {
    padding: 4,
  },
  tooltip: {
    position: 'absolute',
    bottom: 32,
    right: -17,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 188,
  },
  tooltipArrowOuter: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.semantic.border,
    borderBottomWidth: 0,
  },
  tooltipArrowInner: {
    position: 'absolute',
    bottom: -7,
    right: 21,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.semantic.surface,
    borderBottomWidth: 0,
  },
  tooltipText: {
    fontSize: 12,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
  assetSection: {
    marginBottom: 16,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  amountContainer: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 120,
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[600],
    textAlign: 'right',
  },
});
