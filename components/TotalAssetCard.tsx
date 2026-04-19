import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface TotalAssetCardProps {
  totalAssets: number;
  cashTotal: number;
  stockTotal: number;
  formatNumber: (num: number) => string;
  displayInMan?: boolean;
  onToggleUnit?: () => void;
}

export default function TotalAssetCard({
  totalAssets,
  cashTotal,
  stockTotal,
  formatNumber,
  displayInMan = false,
  onToggleUnit,
}: TotalAssetCardProps) {
  const ratioBase = cashTotal + stockTotal || totalAssets || 1;
  const cashPercent = Math.round((Math.max(0, cashTotal) / ratioBase) * 100);
  const stockPercent = Math.round((Math.max(0, stockTotal) / ratioBase) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Wallet size={24} color={Colors.primary[600]} />
          <Text style={styles.title}>総資産</Text>
        </View>
        {onToggleUnit && (
          <TouchableOpacity
            style={styles.unitToggle}
            onPress={onToggleUnit}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitLabel, !displayInMan && styles.unitLabelActive]}>円</Text>
            <Text style={styles.unitSeparator}>/</Text>
            <Text style={[styles.unitLabel, displayInMan && styles.unitLabelActive]}>万円</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.amount}>¥{formatNumber(totalAssets)}</Text>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailLabel}>内訳</Text>
        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <View style={[styles.detailDot, styles.detailDotCash]} />
            <View style={styles.detailNameContainer}>
              <Text style={styles.detailName}>現金</Text>
              <Text style={styles.detailPercent}>{cashPercent}%</Text>
            </View>
          </View>
          <Text style={styles.detailAmount}>¥{formatNumber(cashTotal)}</Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailRow}>
          <View style={styles.detailLeft}>
            <View style={[styles.detailDot, styles.detailDotStock]} />
            <View style={styles.detailNameContainer}>
              <Text style={styles.detailName}>株式</Text>
              <Text style={styles.detailPercent}>{stockPercent}%</Text>
            </View>
          </View>
          <Text style={styles.detailAmount}>¥{formatNumber(stockTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.text.tertiary,
  },
  unitLabelActive: {
    color: Colors.semantic.button.primary,
    fontWeight: '700',
  },
  unitSeparator: {
    fontSize: 11,
    color: Colors.semantic.text.tertiary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  content: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    lineHeight: 38,
  },
  detailSection: {
    backgroundColor: Colors.base.gray50,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  detailDotCash: {
    backgroundColor: Colors.primary[200],
  },
  detailDotStock: {
    backgroundColor: Colors.accent.warning[500],
  },
  detailNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  detailPercent: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.semantic.border,
  },
});
