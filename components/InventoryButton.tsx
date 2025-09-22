import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calculator } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface InventoryButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function InventoryButton({
  onPress,
  disabled = false,
  loading = false,
}: InventoryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Calculator
          size={20}
          color={
            disabled ? Colors.semantic.text.tertiary : Colors.semantic.surface
          }
        />
        <Text style={[styles.text, disabled && styles.textDisabled]}>
          {loading ? '計算中...' : '棚卸し計算'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: Colors.semantic.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
  textDisabled: {
    color: Colors.semantic.text.tertiary,
  },
});
