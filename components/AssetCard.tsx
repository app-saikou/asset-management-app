import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import { Asset, AssetType } from '../hooks/useMultipleAssets';

interface AssetCardProps {
  asset: Asset;
  onEdit?: (asset: Asset) => void;
  onDelete?: (id: string) => void;
  formatNumber: (num: number) => string;
  getAssetTypeIcon: (type: AssetType) => React.ReactNode;
}

export default function AssetCard({
  asset,
  onEdit,
  onDelete,
  formatNumber,
  getAssetTypeIcon,
}: AssetCardProps) {
  const handlePress = () => {
    Alert.alert(asset.name, '操作を選択してください', [
      {
        text: 'キャンセル',
        style: 'cancel',
      },
      {
        text: '編集',
        onPress: () => onEdit?.(asset),
      },
      {
        text: '削除',
        onPress: () => {
          Alert.alert(
            '削除確認',
            `「${asset.name}」を削除しますか？この操作は取り消せません。`,
            [
              {
                text: 'キャンセル',
                style: 'cancel',
              },
              {
                text: '削除',
                onPress: () => onDelete?.(asset.id),
                style: 'destructive',
              },
            ]
          );
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconWrapper}>{getAssetTypeIcon(asset.type)}</View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {asset.name}
          </Text>
          {asset.memo && (
            <Text style={styles.memo} numberOfLines={1}>
              {asset.memo}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightContent}>
        <Text style={styles.amount}>¥{formatNumber(asset.amount)}</Text>
        <View style={styles.rateBadge}>
          <Text style={styles.rateLabel}>年利</Text>
          <Text style={styles.rateValue}>{asset.annual_rate}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.semantic.text.tertiary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 2,
  },
  memo: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.semantic.button.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  rateLabel: {
    fontSize: 10,
    color: Colors.semantic.button.primary,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.button.primary,
  },
});
