import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface FloatingActionButtonProps {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function FloatingActionButton({
  onPress,
  label = '資産を追加',
  disabled = false,
}: FloatingActionButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // エントランスアニメーション
    const entranceAnim = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]);

    entranceAnim.start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Plus
            size={28}
            color={
              disabled ? Colors.semantic.text.tertiary : Colors.semantic.surface
            }
            strokeWidth={2.5}
          />
        </View>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 84, // タブバーより上に配置
    right: 20,
    zIndex: 1000,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 140,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.semantic.border,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.surface,
    letterSpacing: 0.5,
  },
  labelDisabled: {
    color: Colors.semantic.text.tertiary,
  },
});
