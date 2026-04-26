import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useDisplayUnit } from '../contexts/DisplayUnitContext';
import { Colors } from '../constants/Colors';

interface MoneyTextProps {
  amount: number;
  prefix?: string;
  size: number;
  weight?: '500' | '600' | '700' | '800';
  color?: string;
  style?: ViewStyle;
}

export function formatMan(num: number): string {
  const man = Math.round(num / 1000) / 10;
  return man.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
}

export default function MoneyText({
  amount,
  prefix,
  size,
  weight = '700',
  color,
  style,
}: MoneyTextProps) {
  const { isHidden } = useDisplayUnit();
  const mainColor = color ?? Colors.semantic.text.primary;
  const currencySize = Math.round(size * 0.55);
  const unitSize = Math.round(size * 0.5);
  const unitLift = Math.round(size * 0.08);

  if (isHidden) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'flex-end' }, style]}>
        <Text style={{ fontSize: size, fontWeight: weight, color: mainColor }}>
          ¥ ••••••
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end' }, style]}>
      {prefix && (
        <Text
          style={{
            fontSize: currencySize,
            fontWeight: weight,
            color: mainColor,
            marginBottom: unitLift,
          }}
        >
          {prefix}
        </Text>
      )}
      <Text
        style={{
          fontSize: currencySize,
          fontWeight: weight,
          color: mainColor,
          marginBottom: unitLift,
          marginRight: 1,
        }}
      >
        ¥
      </Text>
      <Text
        style={{
          fontSize: size,
          fontWeight: weight,
          color: mainColor,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatMan(amount)}
      </Text>
      <Text
        style={{
          fontSize: unitSize,
          fontWeight: weight,
          color: mainColor,
          marginLeft: 2,
          marginBottom: unitLift,
        }}
      >
        万
      </Text>
    </View>
  );
}
