import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface TotalAssetCardProps {
  totalAssets: number;
  formatNumber: (num: number) => string;
}

export default function TotalAssetCard({
  totalAssets,
  formatNumber,
}: TotalAssetCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Wallet size={24} color={Colors.semantic.surface} />
          <Text style={styles.title}>総資産</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.amount}>¥{formatNumber(totalAssets)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
  content: {
    alignItems: 'flex-start',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.semantic.surface,
    lineHeight: 38,
  },
});
