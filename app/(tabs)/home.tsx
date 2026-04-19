import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Target, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useMultipleAssets } from '../../hooks/useMultipleAssets';
import { useHomeProjection } from '../../hooks/useHomeProjection';
import { useCalculationAges } from '../../hooks/useAgeBasedCalculation';
import { useDisplayUnit } from '../../contexts/DisplayUnitContext';

export default function HomeScreen() {
  const router = useRouter();
  const { assets, totalAssets, loading, formatNumber } = useMultipleAssets();
  const { ages } = useCalculationAges();
  const { result: homeProjection, loading: projectionLoading } = useHomeProjection(assets, ages);
  const { isHidden, toggleHidden, formatNumberDisplay: fmt } = useDisplayUnit();
  const formatNumberDisplay = useCallback((num: number) => fmt(num, formatNumber), [fmt, formatNumber]);

  const isLoading = loading || projectionLoading;

  if (isLoading && !homeProjection && totalAssets === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.semantic.button.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const gap = homeProjection?.targetAmount
    ? homeProjection.targetAmount - homeProjection.futureValue
    : null;
  const isGoalAchieved = gap !== null && gap <= 0;
  const progressPercent = homeProjection?.targetAmount && homeProjection.targetAmount > 0
    ? Math.min(100, Math.round((homeProjection.futureValue / homeProjection.targetAmount) * 100))
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヒーローゾーン：総資産 */}
        <View style={styles.heroZone}>
          <View style={styles.heroLabelRow}>
            <Text style={styles.heroLabel}>総資産</Text>
            <TouchableOpacity onPress={toggleHidden} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {isHidden
                ? <EyeOff size={16} color={Colors.semantic.text.tertiary} />
                : <Eye size={16} color={Colors.semantic.text.tertiary} />
              }
            </TouchableOpacity>
          </View>
          <Text style={styles.heroAmount}>
            {isHidden ? '¥ ••••••' : `¥${formatNumberDisplay(totalAssets)}`}
          </Text>
          <TouchableOpacity
            style={styles.assetsLink}
            onPress={() => router.push('/(tabs)/assets')}
            activeOpacity={0.7}
          >
            <Text style={styles.assetsLinkText}>資産の内訳を見る</Text>
            <ChevronRight size={13} color={Colors.semantic.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* 将来予測ゾーン */}
        {homeProjection ? (
          <View style={styles.projectionZone}>
            <View style={styles.projectionHeader}>
              <TrendingUp size={14} color={Colors.accent.success[500]} />
              <Text style={styles.projectionLabel}>
                {homeProjection.targetAge}歳時の予測資産
              </Text>
              <Text style={styles.projectionYearsBadge}>
                {homeProjection.yearsToTarget}年後
              </Text>
            </View>

            <Text style={styles.projectionAmount}>
              ¥{formatNumberDisplay(homeProjection.futureValue)}
            </Text>

            <Text style={styles.projectionIncrease}>
              現在から{' '}
              <Text style={styles.projectionIncreaseValue}>
                +¥{formatNumberDisplay(homeProjection.increaseAmount)}
              </Text>
              {' '}増加
            </Text>

            {/* 目標プログレスバー */}
            {progressPercent !== null && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: isGoalAchieved
                          ? Colors.accent.success[500]
                          : Colors.semantic.button.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressFooter}>
                  <View style={styles.progressGoalRow}>
                    <Target
                      size={12}
                      color={isGoalAchieved ? Colors.accent.success[600] : Colors.semantic.text.tertiary}
                    />
                    {isGoalAchieved ? (
                      <Text style={styles.goalAchievedText}>目標達成！</Text>
                    ) : (
                      <Text style={styles.progressGoalText}>
                        目標まであと ¥{formatNumberDisplay(gap!)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyProjection}>
            <Text style={styles.emptyText}>
              資産を登録すると将来予測が表示されます
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/assets')}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>資産を登録する</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // ヒーローゾーン
  heroZone: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.semantic.text.tertiary,
    letterSpacing: 0.6,
  },
  heroAmount: {
    fontSize: 60,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    letterSpacing: -2,
    lineHeight: 68,
    marginBottom: 12,
  },
  assetsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  assetsLinkText: {
    fontSize: 13,
    color: Colors.semantic.text.tertiary,
  },

  // 将来予測ゾーン
  projectionZone: {
    marginHorizontal: 20,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  projectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
  projectionYearsBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent.success[600],
    backgroundColor: `${Colors.accent.success[500]}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  projectionAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: 8,
  },
  projectionIncrease: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 20,
  },
  projectionIncreaseValue: {
    fontWeight: '700',
    color: Colors.accent.success[600],
  },

  // プログレスバー
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.semantic.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressGoalText: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  goalAchievedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent.success[600],
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.text.secondary,
  },

  // 空状態
  emptyProjection: {
    marginHorizontal: 20,
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
});
