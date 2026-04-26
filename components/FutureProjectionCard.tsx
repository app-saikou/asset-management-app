import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, Target, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import MoneyText, { formatMan } from './MoneyText';

interface FutureProjectionCardProps {
  targetAge: number;
  futureValue: number;
  increaseAmount: number;
  yearsToTarget: number;
  targetAmount?: number | null;
  formatNumber: (num: number) => string;
  onPress?: () => void;
}

export default function FutureProjectionCard({
  targetAge,
  futureValue,
  increaseAmount,
  yearsToTarget,
  targetAmount,
  formatNumber,
  onPress,
}: FutureProjectionCardProps) {
  const gap = targetAmount ? targetAmount - futureValue : null;
  const isGoalAchieved = gap !== null && gap <= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrendingUp size={18} color={Colors.accent.success[500]} />
          <Text style={styles.title}>{targetAge}歳時の予測資産</Text>
          <Text style={styles.yearsBadge}>{yearsToTarget}年後</Text>
        </View>
        {onPress && (
          <ChevronRight size={16} color={Colors.semantic.text.tertiary} />
        )}
      </View>

      <MoneyText amount={futureValue} size={28} weight="800" style={styles.futureValueRow} />

      <View style={styles.increaseRow}>
        <Text style={styles.increaseLabel}>現在から</Text>
        <Text style={styles.increaseAmount}>
          +¥{formatMan(increaseAmount)}万
        </Text>
        <Text style={styles.increaseLabel}>増加</Text>
      </View>

      {targetAmount != null && (
        <View
          style={[
            styles.goalSection,
            isGoalAchieved ? styles.goalAchieved : styles.goalNotAchieved,
          ]}
        >
          <Target
            size={14}
            color={
              isGoalAchieved
                ? Colors.accent.success[600]
                : Colors.semantic.text.secondary
            }
          />
          {isGoalAchieved ? (
            <Text style={styles.goalAchievedText}>目標達成！</Text>
          ) : (
            <>
              <Text style={styles.goalLabel}>目標まであと</Text>
              <Text style={styles.goalGap}>¥{formatMan(gap!)}万</Text>
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  yearsBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent.success[600],
    backgroundColor: `${Colors.accent.success[500]}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  futureValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  futureValueRow: {
    marginBottom: 8,
  },
  increaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  increaseLabel: {
    fontSize: 13,
    color: Colors.semantic.text.secondary,
  },
  increaseAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent.success[600],
  },
  goalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  goalAchieved: {},
  goalNotAchieved: {},
  goalLabel: {
    fontSize: 13,
    color: Colors.semantic.text.secondary,
  },
  goalGap: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  goalAchievedText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent.success[600],
  },
});
