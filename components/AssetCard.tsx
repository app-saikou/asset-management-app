import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MoreHorizontal, Edit3, Trash2 } from 'lucide-react-native';
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
  const handleMorePress = () => {
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.iconContainer}>
            {getAssetTypeIcon(asset.type)}
          </View>
          <View style={styles.titleText}>
            <Text style={styles.name}>{asset.name}</Text>
            {asset.memo && <Text style={styles.memo}>{asset.memo}</Text>}
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleMorePress}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={20} color={Colors.semantic.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.amount}>¥{formatNumber(asset.amount)}</Text>

        <View style={styles.details}>
          <Text style={styles.annualRate}>年利: {asset.annual_rate}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 20,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 2,
  },
  memo: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    lineHeight: 18,
  },
  moreButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  content: {
    gap: 12,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  annualRate: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
});
