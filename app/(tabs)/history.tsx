import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAssetHistory, AssetHistoryItem } from '../../hooks/useAssetHistory';
import MoneyText from '../../components/MoneyText';

type DateGroup = {
  dateKey: string;
  dateLabel: string;
  monthLabel: string;
  items: AssetHistoryItem[];
};

function calcAgeAtDate(date: Date, birthDate: Date): { years: number; months: number } {
  let years = date.getFullYear() - birthDate.getFullYear();
  let months = date.getMonth() - birthDate.getMonth();
  if (date.getDate() < birthDate.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return { years, months };
}

function formatAgeLabel(years: number, months: number): string {
  return months > 0 ? `${years}歳${months}ヶ月` : `${years}歳`;
}

const swirlArrowDark = require('../../assets/images/swirl-arrow-dark.png');
const swirlArrowLight = require('../../assets/images/swirl-arrow-light.png');

export default function HistoryScreen() {
  const { history, loading, error, fetchHistory } = useAssetHistory();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_profiles')
      .select('birth_date')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.birth_date) setBirthDate(new Date(data.birth_date));
      });
  }, [user?.id]);

  const dateGroups = React.useMemo((): DateGroup[] => {
    const map = new Map<string, DateGroup>();
    history.forEach((item) => {
      const date = new Date(item.created_at);
      const dateKey = format(date, 'yyyy-MM-dd');
      const dateLabel = format(date, 'M月d日', { locale: ja });
      const monthLabel = format(date, 'yyyy年M月', { locale: ja });
      if (!map.has(dateKey)) {
        map.set(dateKey, { dateKey, dateLabel, monthLabel, items: [] });
      }
      map.get(dateKey)!.items.push(item);
    });
    return Array.from(map.values());
  }, [history]);

  useFocusEffect(
    React.useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const navigateToDetail = (item: AssetHistoryItem) => {
    router.push({
      pathname: '/history-detail',
      params: {
        id: item.id,
        currentAssets: item.current_assets.toString(),
        years: item.years.toString(),
        futureValue: item.future_value.toString(),
        increaseAmount: item.increase_amount.toString(),
        createdAt: item.created_at,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.semantic.button.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <TrendingUp size={48} color={Colors.semantic.text.tertiary} />
          <Text style={styles.emptyText}>まだ記録がありません</Text>
          <Text style={styles.emptySubtext}>
            「資産を更新」を実行すると記録が保存されます
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>タイムライン</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {dateGroups.map((group, groupIndex) => {
          const showMonthLabel =
            groupIndex === 0 ||
            dateGroups[groupIndex - 1].monthLabel !== group.monthLabel;
          const isLastGroup = groupIndex === dateGroups.length - 1;

          return (
            <View key={group.dateKey}>
              {/* 最初のグループの月ラベル（ライン不要） */}
              {showMonthLabel && groupIndex === 0 && (
                <Text style={styles.monthLabelFirst}>{group.monthLabel}</Text>
              )}

              {/* 2グループ目以降：ラインを継続しながら月ラベルを挟む */}
              {groupIndex > 0 && (
                <View style={styles.connectorRow}>
                  <View style={styles.timelineCol}>
                    <View style={styles.lineSegment} />
                  </View>
                  {showMonthLabel && (
                    <Text style={styles.monthLabelInline}>{group.monthLabel}</Text>
                  )}
                </View>
              )}

              {/* 日付ヘッダー行（ドット付き） */}
              <View style={styles.dateHeaderRow}>
                <View style={styles.timelineCol}>
                  <View style={styles.dot} />
                  <View style={styles.lineSegment} />
                </View>
                <Text style={styles.dateLabel}>{group.dateLabel}</Text>
              </View>

              {/* 各エントリー */}
              {group.items.map((item, itemIndex) => {
                const isLastItem = itemIndex === group.items.length - 1;
                const isVeryLast = isLastGroup && isLastItem;

                return (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.timelineCol}>
                      {isVeryLast ? (
                        <View style={styles.lineFade} />
                      ) : (
                        <View style={styles.itemLine} />
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.card}
                      onPress={() => navigateToDetail(item)}
                      activeOpacity={0.7}
                    >
                      {/* 比較行 */}
                      <View style={styles.compareRow}>
                        {/* 左: 現在 */}
                        <View style={styles.compareColCurrent}>
                          {birthDate && (() => {
                            const { years, months } = calcAgeAtDate(new Date(item.created_at), birthDate);
                            return (
                              <View style={styles.ageBadgeCurrent}>
                                <Text style={styles.ageBadgeCurrentText}>{formatAgeLabel(years, months)}</Text>
                              </View>
                            );
                          })()}
                          <MoneyText
                            amount={item.current_assets}
                            size={22}
                            weight="700"
                          />
                        </View>

                        {/* 中央: 矢印 */}
                        <Image
                          source={colorScheme === 'dark' ? swirlArrowLight : swirlArrowDark}
                          style={styles.swirlArrow}
                          resizeMode="contain"
                        />

                        {/* 右: 将来 */}
                        <View style={styles.compareColFuture}>
                          {(() => {
                            const label = !birthDate
                              ? `${item.years}年後`
                              : formatAgeLabel(
                                  calcAgeAtDate(new Date(item.created_at), birthDate).years + item.years,
                                  item.target_month ?? 0
                                );
                            return (
                              <View style={styles.ageBadge}>
                                <Text style={styles.ageBadgeText}>{label}</Text>
                              </View>
                            );
                          })()}
                          <MoneyText
                            amount={item.future_value}
                            size={22}
                            weight="700"
                          />
                        </View>
                      </View>

                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const DOT_SIZE = 10;
const LINE_WIDTH = 2;
const TIMELINE_WIDTH = 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  bottomPadding: {
    height: 120,
  },

  // 月ラベル
  monthLabelFirst: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 4,
    marginLeft: TIMELINE_WIDTH + 10,
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  monthLabelInline: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
    letterSpacing: 0.5,
    marginLeft: 10,
  },

  // タイムライン共通
  timelineCol: {
    width: TIMELINE_WIDTH,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  lineSegment: {
    width: LINE_WIDTH,
    flex: 1,
    backgroundColor: Colors.semantic.border,
    minHeight: 20,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.semantic.button.primary,
    shadowColor: Colors.semantic.button.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },

  // 日付ヘッダー行
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginLeft: 12,
  },

  // アイテム行
  itemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  itemLine: {
    width: LINE_WIDTH,
    flex: 1,
    backgroundColor: Colors.semantic.border,
  },
  lineFade: {
    width: LINE_WIDTH,
    height: 24,
    backgroundColor: Colors.semantic.border,
    opacity: 0.25,
  },

  // カード
  card: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 10,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 12,
  },
  compareColCurrent: {
    flex: 2,
    gap: 4,
    alignItems: 'flex-start',
  },
  compareColFuture: {
    flex: 3,
    gap: 4,
    alignItems: 'flex-start',
  },
  swirlArrow: {
    width: 72,
    height: 56,
    alignSelf: 'center',
    flexShrink: 0,
    opacity: 0.8,
  },
  ageBadgeCurrent: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.semantic.button.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ageBadgeCurrentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.semantic.button.primary,
    letterSpacing: 0.2,
  },
  ageBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.semantic.text.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    letterSpacing: 0.3,
  },

  // エラー・空状態
  errorText: {
    fontSize: 16,
    color: Colors.accent.error[500],
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
  },
});
