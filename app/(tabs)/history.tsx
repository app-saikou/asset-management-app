import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useAssetHistory, AssetHistoryItem } from '../../hooks/useAssetHistory';

export default function HistoryScreen() {
  const { groupedHistory, loading, error, formatNumber } = useAssetHistory();
  const [expandedGroups, setExpandedGroups] = React.useState<{
    [key: string]: boolean;
  }>({});

  // グループの展開/折りたたみ
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // 履歴詳細画面へ遷移
  const navigateToDetail = (item: AssetHistoryItem) => {
    router.push({
      pathname: '/history-detail',
      params: {
        id: item.id,
        currentAssets: item.current_assets.toString(),
        annualRate: item.annual_rate.toString(),
        years: item.years.toString(),
        futureValue: item.future_value.toString(),
        increaseAmount: item.increase_amount.toString(),
        createdAt: item.created_at,
      },
    });
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
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

  const groupKeys = Object.keys(groupedHistory);

  if (groupKeys.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <TrendingUp size={48} color={Colors.semantic.text.tertiary} />
          <Text style={styles.emptyText}>まだ履歴がありません</Text>
          <Text style={styles.emptySubtext}>
            資産計算を実行すると履歴が保存されます
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {groupKeys.map((groupKey) => {
          const items = groupedHistory[groupKey];
          const isExpanded = expandedGroups[groupKey] !== false; // デフォルトで展開

          return (
            <View key={groupKey} style={styles.groupContainer}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(groupKey)}
                activeOpacity={0.7}
              >
                <View style={styles.groupTitleContainer}>
                  <Calendar size={20} color={Colors.semantic.text.secondary} />
                  <Text style={styles.groupTitle}>{groupKey}</Text>
                  <Text style={styles.groupCount}>({items.length}件)</Text>
                </View>
                {isExpanded ? (
                  <ChevronDown
                    size={20}
                    color={Colors.semantic.text.secondary}
                  />
                ) : (
                  <ChevronRight
                    size={20}
                    color={Colors.semantic.text.secondary}
                  />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.groupContent}>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.historyItem}
                      onPress={() => navigateToDetail(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyDate}>
                          {formatDate(item.created_at)}
                        </Text>
                        <TrendingUp
                          size={16}
                          color={Colors.accent.success[500]}
                        />
                      </View>

                      <View style={styles.historyContent}>
                        <Text style={styles.historyAmount}>
                          ¥{formatNumber(item.current_assets)} → ¥
                          {formatNumber(item.future_value)}
                        </Text>
                        <Text style={styles.historyDetails}>
                          年利: {item.annual_rate}% | 期間: {item.years}年
                        </Text>
                        <Text style={styles.historyIncrease}>
                          増加: +¥{formatNumber(item.increase_amount)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        <View style={styles.bottomPadding} />
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginLeft: 8,
  },
  groupCount: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginLeft: 8,
  },
  groupContent: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  historyContent: {
    gap: 6,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  historyDetails: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  historyIncrease: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent.success[600],
  },
  bottomPadding: {
    height: 40,
  },
});
