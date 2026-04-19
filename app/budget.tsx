import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Edit3,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Calendar,
  Banknote,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useBudget } from '../hooks/useBudget';
import { useMultipleAssets } from '../hooks/useMultipleAssets';
import { UserBudgetPeriod } from '../types/budget';

type BudgetType = 'income' | 'expense' | 'investment';

export default function BudgetScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BudgetType>('income');
  const {
    periods,
    removePeriod,
    loading: budgetLoading,
    error: budgetError,
    refetch: refetchBudget,
  } = useBudget();
  const { assets, fetchAssets } = useMultipleAssets();

  useEffect(() => {
    fetchAssets();
    refetchBudget();
  }, []);

  // アクティブなタブに応じて予算をフィルタリング
  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => p.type === activeTab);
  }, [periods, activeTab]);

  const typeConfig = {
    income: {
      icon: ArrowDownCircle,
      color: Colors.accent.success[600],
      label: '収入',
    },
    expense: {
      icon: ArrowUpCircle,
      color: Colors.accent.error[600],
      label: '支出',
    },
    investment: {
      icon: BarChart3,
      color: Colors.base.gray900,
      label: '投資',
    },
  };

  const handleDeletePeriod = async (periodId: string) => {
    Alert.alert('削除確認', 'この予算を削除しますか？', [
      {
        text: 'キャンセル',
        style: 'cancel',
      },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePeriod(periodId);
            await refetchBudget();
            Alert.alert('成功', '削除しました');
          } catch (e: unknown) {
            const errorMessage =
              e instanceof Error ? e.message : '削除に失敗しました';
            Alert.alert('エラー', errorMessage);
          }
        },
      },
    ]);
  };

  const handleAddBudget = () => {
    router.push(`/budget-edit?mode=add&type=${activeTab}`);
  };

  const handleEditBudget = (period: UserBudgetPeriod) => {
    router.push(`/budget-edit?mode=edit&id=${period.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.semantic.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>予算設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* タブナビゲーション */}
      <View style={styles.tabContainer}>
        {(['income', 'expense', 'investment'] as BudgetType[]).map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          const isActive = activeTab === type;

          return (
            <TouchableOpacity
              key={type}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(type)}
              activeOpacity={0.7}
            >
              <Icon
                size={18}
                color={isActive ? config.color : Colors.semantic.text.tertiary}
              />
              <Text
                style={[styles.tabText, isActive && { color: config.color }]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* コンテンツ */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {budgetLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>読み込み中...</Text>
          </View>
        ) : budgetError ? (
          <View style={styles.emptyState}>
            <Text style={styles.errorText}>{budgetError}</Text>
          </View>
        ) : filteredPeriods.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {typeConfig[activeTab].label}予算が登録されていません
            </Text>
            <Text style={styles.emptyStateSubtext}>
              プラスボタンから追加してください
            </Text>
          </View>
        ) : (
          <View style={styles.periodList}>
            {filteredPeriods.map((p) => {
              const source = assets.find((a) => a.id === p.source_asset_id);
              const target = assets.find((a) => a.id === p.target_asset_id);
              const config = typeConfig[p.type];
              const Icon = config.icon;

              return (
                <View key={p.id} style={styles.periodCard}>
                  <View style={styles.cardContent}>
                    {/* ヘッダー: タイプバッジとアクションボタン */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Icon size={18} color={config.color} />
                        <View
                          style={[
                            styles.typeLabelBadge,
                            { backgroundColor: `${config.color}15` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeLabelText,
                              { color: config.color },
                            ]}
                          >
                            {config.label}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.cardActionButton}
                          onPress={() => handleEditBudget(p)}
                        >
                          <Edit3
                            size={18}
                            color={Colors.semantic.text.secondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardActionButton}
                          onPress={() => handleDeletePeriod(p.id)}
                        >
                          <X size={18} color={Colors.semantic.text.tertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* メインコンテンツ */}
                    <View style={styles.cardMainContent}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={styles.cardAmount}>
                        ¥{Number(p.monthly_amount).toLocaleString()}
                        <Text style={styles.cardAmountUnit}>/月</Text>
                      </Text>
                    </View>

                    {/* 期間情報 */}
                    <View style={styles.cardInfoRow}>
                      <Calendar
                        size={14}
                        color={Colors.semantic.text.tertiary}
                      />
                      <Text style={styles.cardDate}>
                        {p.start_date.replace(/-/g, '.')} -{' '}
                        {p.end_date.replace(/-/g, '.')}
                      </Text>
                    </View>

                    {/* 資産情報 */}
                    <View style={styles.cardAssetInfo}>
                      {/* 移動元/支払元の表示 */}
                      {p.type !== 'income' && (
                        <View style={styles.cardAssetItem}>
                          <Text style={styles.cardAssetLabel}>
                            {p.type === 'expense' ? '支払元' : '移動元'}
                          </Text>
                          {source ? (
                            <View style={styles.cardAssetValue}>
                              <Banknote
                                size={12}
                                color={Colors.semantic.text.secondary}
                              />
                              <Text style={styles.cardAssetText}>
                                {source.name}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.cardAssetMissingText}>
                              登録されていません
                            </Text>
                          )}
                        </View>
                      )}
                      {/* 移動先/入金先の表示 */}
                      {p.type !== 'expense' && (
                        <View style={styles.cardAssetItem}>
                          <Text style={styles.cardAssetLabel}>
                            {p.type === 'income' ? '入金先' : '移動先'}
                          </Text>
                          {target ? (
                            <View style={styles.cardAssetValue}>
                              {target.type === 'cash' ? (
                                <Banknote
                                  size={12}
                                  color={Colors.semantic.text.secondary}
                                />
                              ) : (
                                <BarChart3
                                  size={12}
                                  color={Colors.semantic.text.secondary}
                                />
                              )}
                              <Text style={styles.cardAssetText}>
                                {target.name}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.cardAssetMissingText}>
                              登録されていません
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* プラスボタン（FAB） */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddBudget}
        activeOpacity={0.8}
      >
        <Plus size={24} color={Colors.semantic.surface} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.base.gray100,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.semantic.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.semantic.text.tertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.accent.error[600],
    textAlign: 'center',
  },
  periodList: {
    gap: 12,
  },
  periodCard: {
    flexDirection: 'row',
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.semantic.surface,
  },
  cardMainContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  cardAmountUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
    marginLeft: 4,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
  },
  cardAssetInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
  },
  cardAssetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardAssetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
    backgroundColor: Colors.base.gray50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardAssetValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAssetText: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  cardAssetMissingText: {
    fontSize: 12,
    color: Colors.accent.error[600],
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 44,
    bottom: 44,
    width: 54,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
