import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Asset } from '../hooks/useMultipleAssets';
import AssetCard from './AssetCard';

interface AssetSectionCardProps {
  assets: Asset[];
  formatNumber: (num: number) => string;
  getAssetTypeIcon: (type: 'cash' | 'stock') => React.ReactNode;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (id: string) => void;
}

export default function AssetSectionCard({
  assets,
  formatNumber,
  getAssetTypeIcon,
  onEditAsset,
  onDeleteAsset,
}: AssetSectionCardProps) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onEdit={onEditAsset}
          onDelete={onDeleteAsset}
          formatNumber={formatNumber}
          getAssetTypeIcon={getAssetTypeIcon}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
});
