import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface AddAssetCardProps {
  onPress: () => void;
}

export default function AddAssetCard({ onPress }: AddAssetCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Plus size={32} color={Colors.semantic.button.primary} />
        </View>
        <Text style={styles.text}>資産を追加</Text>
        <Text style={styles.subtext}>新しい資産を登録してください</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.semantic.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.semantic.button.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  subtext: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
  },
});
