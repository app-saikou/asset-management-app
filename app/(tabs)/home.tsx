import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Target, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useMultipleAssets } from '../../hooks/useMultipleAssets';
import { useHomeProjection } from '../../hooks/useHomeProjection';
import { useCalculationAges } from '../../hooks/useAgeBasedCalculation';
import { useDisplayUnit } from '../../contexts/DisplayUnitContext';
import { useStreak } from '../../hooks/useStreak';

export default function HomeScreen() {
  const router = useRouter();
  const { assets, totalAssets, loading, formatNumber, fetchAssets } = useMultipleAssets();
  const { ages, fetchAges } = useCalculationAges();
  const { result: homeProjection, loading: projectionLoading } = useHomeProjection(assets, ages);
  const { isHidden, toggleHidden, formatNumberDisplay: fmt } = useDisplayUnit();
  const { result: streakResult, fetchStreak } = useStreak();

  useFocusEffect(
    useCallback(() => {
      fetchAssets();
      fetchAges();
      fetchStreak();
    }, [fetchAssets, fetchAges, fetchStreak])
  );
  const formatNumberDisplay = useCallback((num: number) => fmt(num, formatNumber), [fmt, formatNumber]);
  const formatMan = useCallback((num: number) => {
    const man = Math.round(num / 1000) / 10;
    return man.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
  }, []);

  const isLoading = loading || projectionLoading;

  const isOnTrack = homeProjection?.targetAmount
    ? homeProjection.futureValue >= homeProjection.targetAmount
    : null;
  const futureGap = homeProjection?.targetAmount
    ? homeProjection.targetAmount - homeProjection.futureValue
    : null;
  const progressPercent = homeProjection?.targetAmount && homeProjection.targetAmount > 0
    ? Math.min(100, Math.round((totalAssets / homeProjection.targetAmount) * 100))
    : null;

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (progressPercent !== null) {
      Animated.spring(progressAnim, {
        toValue: progressPercent,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [progressPercent]);

  if (isLoading && !homeProjection && totalAssets === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.semantic.button.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroCurrency}>¥</Text>
            {isHidden ? (
              <Text style={styles.heroAmount}>••••••</Text>
            ) : (
              <>
                <Text style={styles.heroAmount}>{formatMan(totalAssets)}</Text>
                <Text style={styles.heroUnit}>万</Text>
              </>
            )}
          </View>
          {/* ストリーク */}
          {streakResult?.hasAnyHistory && (
            <View style={styles.streakContainer}>
              {streakResult.streak > 0 && (
                <View style={styles.streakHeaderRow}>
                  <Text style={styles.streakFireEmoji}>🔥</Text>
                  <Text style={styles.streakCountText}>{streakResult.streak}ヶ月連続更新中</Text>
                </View>
              )}
              <View style={styles.streakPillsRow}>
                {streakResult.months.map((m, i) => (
                  <View key={i} style={[styles.streakPill, m.hasUpdate && styles.streakPillFilled]}>
                    <Text style={[styles.streakPillLabel, m.hasUpdate && styles.streakPillLabelFilled]}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
              <TrendingUp size={14} color={Colors.semantic.text.tertiary} />
              <Text style={styles.projectionLabel}>
                {homeProjection.targetAge}歳時の予測資産
              </Text>
              <Text style={styles.projectionYearsBadge}>
                {homeProjection.yearsToTarget}年後
              </Text>
            </View>

            <View style={styles.projectionAmountRow}>
              <Text style={styles.projectionCurrency}>¥</Text>
              {isHidden ? (
                <Text style={styles.projectionAmount}>••••••</Text>
              ) : (
                <>
                  <Text style={styles.projectionAmount}>{formatMan(homeProjection.futureValue)}</Text>
                  <Text style={styles.projectionUnit}>万</Text>
                </>
              )}
            </View>

            <Text style={styles.projectionIncrease}>
              現在から{' '}
              <Text style={styles.projectionIncreaseValue}>
                {isHidden ? '••••••' : `+¥${formatNumberDisplay(homeProjection.increaseAmount)}`}
              </Text>
              {' '}増加
            </Text>

            {/* 目標プログレスバー */}
            {progressPercent !== null && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: isOnTrack
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
                      color={isOnTrack ? Colors.accent.success[600] : Colors.semantic.text.tertiary}
                    />
                    {isOnTrack ? (
                      <Text style={styles.goalAchievedText}>このペースで達成見込み</Text>
                    ) : (
                      <Text style={styles.progressGoalText}>
                        {isHidden ? '••••••' : `¥${formatNumberDisplay(Math.abs(futureGap!))}`} 不足の見込み
                      </Text>
                    )}
                  </View>
                  <Text style={styles.progressPercent}>{isHidden ? '••%' : `${progressPercent}%`}</Text>
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
  heroCurrency: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 6,
    marginRight: 2,
  },
  heroAmount: {
    fontSize: 60,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    letterSpacing: -2,
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  heroUnit: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginLeft: 4,
    marginBottom: 8,
  },
  assetsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },

  // ストリーク
  streakContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  streakHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  streakFireEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  streakCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    letterSpacing: 0.1,
  },
  streakPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  streakPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    backgroundColor: 'transparent',
  },
  streakPillFilled: {
    backgroundColor: Colors.semantic.text.primary,
    borderColor: Colors.semantic.text.primary,
  },
  streakPillLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.semantic.text.tertiary,
  },
  streakPillLabelFilled: {
    color: '#ffffff',
    fontWeight: '700',
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
    color: Colors.semantic.text.secondary,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  projectionAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  projectionCurrency: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginRight: 2,
  },
  projectionAmount: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    letterSpacing: -1.5,
    lineHeight: 50,
    fontVariant: ['tabular-nums'],
  },
  projectionUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginLeft: 3,
    marginBottom: 8,
  },
  projectionIncrease: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 20,
  },
  projectionIncreaseValue: {
    fontWeight: '700',
    color: Colors.semantic.text.primary,
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
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
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
