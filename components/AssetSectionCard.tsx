import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Asset, AssetType } from '../hooks/useMultipleAssets';
import AssetCard from './AssetCard';

interface AssetSectionCardProps {
  type: AssetType;
  assets: Asset[];
  totalAmount: number;
  formatNumber: (num: number) => string;
  getAssetTypeIcon: (type: AssetType) => React.ReactNode;
  getAssetTypeName: (type: AssetType) => string;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (id: string) => void;
}

export default function AssetSectionCard({
  type,
  assets,
  totalAmount,
  formatNumber,
  getAssetTypeIcon,
  getAssetTypeName,
  onEditAsset,
  onDeleteAsset,
}: AssetSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (assets.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.titleContainer}>
          <View style={styles.iconContainer}>{getAssetTypeIcon(type)}</View>
          <View style={styles.titleText}>
            <Text style={styles.typeName}>
              {getAssetTypeName(type)} ({assets.length}件)
            </Text>
            <Text style={styles.summary}>¥{formatNumber(totalAmount)}</Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronDown size={20} color={Colors.semantic.text.secondary} />
        ) : (
          <ChevronRight size={20} color={Colors.semantic.text.secondary} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  typeName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 2,
  },
  summary: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
  content: {
    paddingLeft: 8,
  },
});
