import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PiggyBank, TrendingUp, ArrowRight } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { AssetHistoryDetail } from '../hooks/useAssetHistory';

interface AssetChangeCardProps {
  detail: AssetHistoryDetail;
  formatNumber: (num: number) => string;
}

export const AssetChangeCard: React.FC<AssetChangeCardProps> = ({
  detail,
  formatNumber,
}) => {
  // 資産タイプのアイコンを取得
  const getAssetTypeIcon = (type: 'cash' | 'stock') => {
    if (type === 'cash') {
      return <PiggyBank size={20} color={Colors.accent.success[500]} />;
    } else {
      return <TrendingUp size={20} color={Colors.accent.info[500]} />;
    }
  };

  // 資産タイプ名を取得
  const getAssetTypeName = (type: 'cash' | 'stock') => {
    return type === 'cash' ? '現金' : '株式';
  };

  // 差額計算
  const difference = detail.adjusted_amount - detail.original_amount;
  const differencePercentage =
    detail.original_amount > 0
      ? (difference / detail.original_amount) * 100
      : 0;

  return (
    <View style={styles.container}>
      {/* 資産ヘッダー */}
      <View style={styles.header}>
        <View style={styles.assetInfo}>
          <View style={styles.iconContainer}>
            {getAssetTypeIcon(detail.asset_type)}
          </View>
          <View style={styles.assetDetails}>
            <Text style={styles.assetName}>{detail.asset_name}</Text>
            <Text style={styles.assetType}>
              {getAssetTypeName(detail.asset_type)} (
              {detail.annual_rate.toFixed(1)}%)
            </Text>
          </View>
        </View>
      </View>

      {/* 金額変化 */}
      <View style={styles.changeContainer}>
        <View style={styles.amountFlow}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>調整前</Text>
            <Text style={styles.originalAmount}>
              ¥{formatNumber(detail.original_amount)}
            </Text>
          </View>

          <View style={styles.arrowContainer}>
            <ArrowRight size={16} color={Colors.semantic.text.tertiary} />
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>調整後</Text>
            <Text style={styles.adjustedAmount}>
              ¥{formatNumber(detail.adjusted_amount)}
            </Text>
          </View>
        </View>

        {/* 差額表示 */}
        {difference !== 0 && (
          <View style={styles.differenceContainer}>
            <Text
              style={[
                styles.differenceText,
                difference >= 0 ? styles.positiveText : styles.negativeText,
              ]}
            >
              {difference >= 0 ? '+' : ''}¥{formatNumber(Math.abs(difference))}(
              {difference >= 0 ? '+' : ''}
              {differencePercentage.toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      {/* 将来価値 */}
      <View style={styles.futureValueContainer}>
        <Text style={styles.futureValueLabel}>10年後の価値</Text>
        <Text style={styles.futureValueAmount}>
          ¥{formatNumber(detail.future_value)}
        </Text>
        <Text style={styles.increaseAmount}>
          +¥{formatNumber(detail.increase_amount)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  header: {
    marginBottom: 16,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.base.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assetDetails: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 2,
  },
  assetType: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  changeContainer: {
    marginBottom: 16,
  },
  amountFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountSection: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    marginBottom: 4,
  },
  originalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  adjustedAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  arrowContainer: {
    paddingHorizontal: 16,
  },
  differenceContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  positiveText: {
    color: Colors.accent.success[600],
  },
  negativeText: {
    color: Colors.accent.error[600],
  },
  futureValueContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  futureValueLabel: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    marginBottom: 4,
  },
  futureValueAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent.success[600],
    marginBottom: 2,
  },
  increaseAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent.success[500],
  },
});
