import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useDisplayUnit } from '../contexts/DisplayUnitContext';

interface TotalAssetCardProps {
  totalAssets: number;
  cashTotal: number;
  stockTotal: number;
  formatNumber: (num: number) => string;
  lastUpdatedAt?: string;
}

export default function TotalAssetCard({
  totalAssets,
  cashTotal,
  stockTotal,
  formatNumber,
  lastUpdatedAt,
}: TotalAssetCardProps) {
  const { isHidden } = useDisplayUnit();

  const ratioBase = cashTotal + stockTotal || totalAssets || 1;
  const cashPercent = Math.round((Math.max(0, cashTotal) / ratioBase) * 100);
  const stockPercent = Math.round((Math.max(0, stockTotal) / ratioBase) * 100);

  const formatUpdatedAt = (iso: string) => {
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  };

  const formatMan = (num: number) => {
    const man = Math.round(num / 1000) / 10;
    return man.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
  };

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>総資産</Text>
        {lastUpdatedAt && (
          <View style={styles.updatedAt}>
            <Clock size={11} color={Colors.semantic.text.tertiary} />
            <Text style={styles.updatedAtText}>{formatUpdatedAt(lastUpdatedAt)}</Text>
          </View>
        )}
      </View>

      <View style={styles.amountRow}>
        {isHidden ? (
          <Text style={styles.amount}>¥ ••••••</Text>
        ) : (
          <>
            <Text style={styles.amount}>¥{formatMan(totalAssets)}</Text>
            <Text style={styles.unit}>万</Text>
          </>
        )}
      </View>

      {/* 水平帯グラフ */}
      <View style={styles.barContainer}>
        <View style={styles.bar}>
          <View style={[styles.barCash, { flex: cashPercent || 1 }]} />
          <View style={[styles.barStock, { flex: stockPercent || 0 }]} />
        </View>
        <View style={styles.barLabels}>
          <View style={styles.barLabelItem}>
            <View style={[styles.dot, styles.dotCash]} />
            <Text style={styles.barLabelText}>
              現金 {isHidden ? '••%' : `${cashPercent}%`}
              {'　'}
              {isHidden ? '••••万' : `${formatMan(cashTotal)}万`}
            </Text>
          </View>
          <View style={styles.barLabelItem}>
            <View style={[styles.dot, styles.dotStock]} />
            <Text style={styles.barLabelText}>
              株式 {isHidden ? '••%' : `${stockPercent}%`}
              {'　'}
              {isHidden ? '••••万' : `${formatMan(stockTotal)}万`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.text.tertiary,
    letterSpacing: 0.6,
  },
  updatedAt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  updatedAtText: {
    fontSize: 11,
    color: Colors.semantic.text.tertiary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  amount: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    letterSpacing: -1.5,
    lineHeight: 54,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginLeft: 4,
    marginBottom: 6,
  },
  barContainer: {
    gap: 10,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Colors.semantic.border,
  },
  barCash: {
    backgroundColor: Colors.semantic.button.primary,
  },
  barStock: {
    backgroundColor: Colors.accent.warning[500],
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCash: {
    backgroundColor: Colors.semantic.button.primary,
  },
  dotStock: {
    backgroundColor: Colors.accent.warning[500],
  },
  barLabelText: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
