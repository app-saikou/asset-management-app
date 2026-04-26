import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { Asset } from '../hooks/useMultipleAssets';
import AssetCard from './AssetCard';

interface AssetSectionCardProps {
  assets: Asset[];
  formatNumber: (num: number) => string;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (id: string) => void;
}

export default function AssetSectionCard({
  assets,
  formatNumber,
  onEditAsset,
  onDeleteAsset,
}: AssetSectionCardProps) {
  if (assets.length === 0) return null;

  return (
    <View style={styles.container}>
      {assets.map((asset, index) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onEdit={onEditAsset}
          onDelete={onDeleteAsset}
          formatNumber={formatNumber}
          isLast={index === assets.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
});
