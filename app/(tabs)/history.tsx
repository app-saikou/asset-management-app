import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Colors } from '../../constants/Colors';
import { useAssetHistory, AssetHistoryItem } from '../../hooks/useAssetHistory';

export default function HistoryScreen() {
  const { history, loading, error, formatNumber, fetchHistory } =
    useAssetHistory();

  const sections = React.useMemo(() => {
    const grouped = history.reduce((acc, item) => {
      const date = new Date(item.created_at);
      const key = format(date, 'yyyy年M月', { locale: ja });
      const existing = acc.find((s) => s.title === key);
      if (existing) {
        existing.data.push(item);
      } else {
        acc.push({ title: key, data: [item] });
      }
      return acc;
    }, [] as { title: string; data: AssetHistoryItem[] }[]);
    return grouped;
  }, [history]);

  // 画面フォーカス時に履歴を再取得
  useFocusEffect(
    React.useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  // 履歴詳細画面へ遷移
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.semantic.button.primary}
          />
          <Text style={styles.loadingText}>履歴を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <TrendingUp size={48} color={Colors.semantic.text.tertiary} />
          <Text style={styles.emptyText}>まだ履歴がありません</Text>
          <Text style={styles.emptySubtext}>
            「資産を更新」を実行すると履歴が保存されます
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>履歴</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={true}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const date = new Date(item.created_at);
          return (
            <View style={styles.itemContainer}>
              <View style={styles.itemHeaderRow}>
                <Text style={styles.itemDateText}>
                  {format(date, 'M月d日', { locale: ja })}
                </Text>
                <Text style={styles.itemTimeText}>
                  {format(date, 'H:mm', { locale: ja })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigateToDetail(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.assetRow}>
                    <Text style={styles.assetLabel}>総資産</Text>
                    <Text style={styles.assetValue}>
                      ¥{formatNumber(item.current_assets)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <View style={styles.futureContainer}>
                    <Text style={styles.futureLabel}>将来資産</Text>
                    <Text style={styles.futureValue}>
                      ¥{formatNumber(item.future_value)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.diffBadge,
                      item.increase_amount >= 0
                        ? styles.diffPositive
                        : styles.diffNegative,
                    ]}
                  >
                    {item.increase_amount >= 0 ? (
                      <ArrowUpRight
                        size={14}
                        color={Colors.accent.success[700]}
                      />
                    ) : (
                      <ArrowDownRight
                        size={14}
                        color={Colors.accent.error[700]}
                      />
                    )}
                    <Text
                      style={[
                        styles.diffText,
                        item.increase_amount >= 0
                          ? styles.textPositive
                          : styles.textNegative,
                      ]}
                    >
                      ¥{formatNumber(Math.abs(item.increase_amount))}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={Colors.semantic.text.tertiary} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListFooterComponent={<View style={styles.bottomPadding} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
    backgroundColor: Colors.semantic.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.accent.error[500],
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: Colors.semantic.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  itemContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  itemDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  itemTimeText: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: Colors.base.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  itemLeft: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  assetLabel: {
    fontSize: 11,
    color: Colors.semantic.text.tertiary,
    fontWeight: '500',
  },
  assetValue: {
    fontSize: 20, // 18 -> 20
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    letterSpacing: -0.5,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginRight: 12,
    gap: 6,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  diffPositive: {
    backgroundColor: Colors.accent.success[50],
  },
  diffNegative: {
    backgroundColor: Colors.accent.error[50],
  },
  diffText: {
    fontSize: 13,
    fontWeight: '700',
  },
  textPositive: {
    color: Colors.accent.success[700],
  },
  textNegative: {
    color: Colors.accent.error[700],
  },
  futureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  futureLabel: {
    fontSize: 11,
    color: Colors.semantic.text.tertiary,
  },
  futureValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  bottomPadding: {
    height: 40,
  },
});
