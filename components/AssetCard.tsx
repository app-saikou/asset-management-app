import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { Asset, AssetType } from '../hooks/useMultipleAssets';

interface AssetCardProps {
  asset: Asset;
  onEdit?: (asset: Asset) => void;
  onDelete?: (id: string) => void;
  formatNumber: (num: number) => string;
  isLast?: boolean;
}

export default function AssetCard({
  asset,
  onEdit,
  onDelete,
  formatNumber,
  isLast,
}: AssetCardProps) {
  const handlePress = () => {
    Alert.alert(asset.name, '操作を選択してください', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '編集', onPress: () => onEdit?.(asset) },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            '削除確認',
            `「${asset.name}」を削除しますか？この操作は取り消せません。`,
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: '削除', style: 'destructive', onPress: () => onDelete?.(asset.id) },
            ]
          );
        },
      },
    ]);
  };

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.6}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{asset.name}</Text>
        {asset.memo && (
          <Text style={styles.memo} numberOfLines={1}>{asset.memo}</Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatNumber(asset.amount)}</Text>
        <Text style={styles.rate}>{asset.annual_rate}%</Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  left: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  memo: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 3,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    fontVariant: ['tabular-nums'],
  },
  rate: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.semantic.text.tertiary,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.semantic.border,
  },
});
