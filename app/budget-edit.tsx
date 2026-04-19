import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Banknote,
  Check,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useBudget } from '../hooks/useBudget';
import { useMultipleAssets } from '../hooks/useMultipleAssets';
import { useSubscription } from '../hooks/useSubscription';
import { useUserProfile } from '../hooks/useAgeBasedCalculation';
import { UserBudgetPeriod } from '../types/budget';

type BudgetType = 'income' | 'expense' | 'investment';

export default function BudgetEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; id?: string; type?: string }>();
  const mode = params.mode || 'add';
  const isEditMode = mode === 'edit';
  const periodId = params.id;

  const { profile } = useUserProfile();
  const { isPro } = useSubscription();
  const {
    periods,
    addPeriod,
    editPeriod,
    loading: budgetLoading,
    refetch: refetchBudget,
  } = useBudget();
  const { assets, fetchAssets } = useMultipleAssets();

  // フォーム状態
  const [periodType, setPeriodType] = useState<BudgetType>(
    (params.type as BudgetType) || 'income'
  );
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date(new Date().getFullYear() + 1, new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10)
  );
  const [periodMonthlyAmount, setPeriodMonthlyAmount] = useState<string>('0');
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);
  const [targetAssetId, setTargetAssetId] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // 編集モードの場合、既存データを読み込む
  useEffect(() => {
    if (isEditMode && periodId) {
      const period = periods.find((p) => p.id === periodId);
      if (period) {
        setPeriodType(period.type);
        setPeriodName(period.name);
        setPeriodStart(period.start_date);
        setPeriodEnd(period.end_date);
        setPeriodMonthlyAmount(period.monthly_amount.toString());
        setSourceAssetId(period.source_asset_id || null);
        setTargetAssetId(period.target_asset_id || null);
      }
    }
  }, [isEditMode, periodId, periods]);

  useEffect(() => {
    fetchAssets();
  }, []);

  const resetBudgetForm = () => {
    setPeriodType('income');
    setPeriodName('月次設定');
    setPeriodStart(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10)
    );
    setPeriodEnd(
      new Date(new Date().getFullYear() + 1, new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10)
    );
    setPeriodMonthlyAmount('0');
    setSourceAssetId(null);
    setTargetAssetId(null);
  };

  const validateAndSubmit = async () => {
    try {
      const monthlyAmountNum = Number(periodMonthlyAmount);
      if (!periodName.trim()) throw new Error('名称を入力してください');
      if (!periodStart || !periodEnd)
        throw new Error('期間の開始・終了日を入力してください');
      if (isNaN(monthlyAmountNum) || monthlyAmountNum < 0)
        throw new Error('月額は0以上の数値で入力してください');

      // フリープランの場合、各タイプは1つまで（編集時は自分自身を除外）
      if (!isPro) {
        const existingCount = periods.filter(
          (p) => p.type === periodType && (!isEditMode || p.id !== periodId)
        ).length;

        if (existingCount >= 1) {
          const typeName =
            periodType === 'income'
              ? '収入'
              : periodType === 'expense'
              ? '支出'
              : '投資';
          throw new Error(
            `${typeName}予算は既に登録済みです。複数登録するにはProプランへのアップグレードが必要です。`
          );
        }
      }

      if (periodType === 'income') {
        if (!targetAssetId)
          throw new Error('収入の加算先資産を選択してください');
      } else if (periodType === 'expense') {
        if (!sourceAssetId)
          throw new Error('支出の減算元資産を選択してください');
      } else {
        if (!sourceAssetId || !targetAssetId)
          throw new Error('投資は移動元/移動先資産を選択してください');
        if (sourceAssetId === targetAssetId)
          throw new Error('移動元と移動先は別の資産を選択してください');
      }

      // 収支整合性の検証（追加時のみ）
      if (!isEditMode) {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDateStr = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, '0')}-01`;

        const activePeriods = periods.filter((period) => {
          const startDate = new Date(period.start_date);
          const endDate = new Date(period.end_date);
          const salaryDay = startDate.getDate();
          const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
          const actualDay = Math.min(salaryDay, lastDayOfMonth);
          const monthSalaryDate = new Date(
            currentYear,
            currentMonth - 1,
            actualDay
          );
          monthSalaryDate.setHours(0, 0, 0, 0);
          const isInPeriod =
            startDate <= monthSalaryDate && monthSalaryDate <= endDate;
          return isInPeriod;
        });

        const totalIncome = activePeriods
          .filter((p) => p.type === 'income')
          .reduce((sum, p) => sum + Number(p.monthly_amount), 0);

        const totalExpense = activePeriods
          .filter((p) => p.type === 'expense')
          .reduce((sum, p) => sum + Number(p.monthly_amount), 0);

        const newPeriodStart = new Date(periodStart);
        const newPeriodEnd = new Date(periodEnd);
        const current = new Date(currentDateStr);
        const isNewPeriodActive =
          newPeriodStart <= current && current <= newPeriodEnd;

        if (isNewPeriodActive) {
          if (periodType === 'income') {
            const newTotalIncome = totalIncome + monthlyAmountNum;
            if (newTotalIncome < totalExpense) {
              throw new Error(
                '収入合計が支出合計を下回っています。収入を増やすか支出を減らしてください。'
              );
            }
          } else if (periodType === 'expense') {
            const newTotalExpense = totalExpense + monthlyAmountNum;
            if (totalIncome < newTotalExpense) {
              throw new Error(
                '支出合計が収入合計を上回っています。支出を減らすか収入を増やしてください。'
              );
            }
          }
        }

        // 終了日が100歳を超えているかチェック
        if (profile?.birth_date) {
          const birthDate = new Date(profile.birth_date);
          const hundredYear = birthDate.getFullYear() + 100;
          const birthMonth = birthDate.getMonth();
          const targetMonthDate = new Date(hundredYear, birthMonth, 1);
          const finalYear = targetMonthDate.getFullYear();
          const finalMonth = targetMonthDate.getMonth() + 1;
          const hundredYearDate = new Date(finalYear, finalMonth - 1, 1);
          hundredYearDate.setHours(0, 0, 0, 0);
          const periodEndDate = new Date(periodEnd);
          periodEndDate.setHours(0, 0, 0, 0);

          if (periodEndDate > hundredYearDate) {
            Alert.alert(
              '終了日の確認',
              '終了日が100歳を超えています。計算は100歳までしか行われません。このまま追加しますか？',
              [
                {
                  text: 'キャンセル',
                  style: 'cancel',
                },
                {
                  text: '追加する',
                  onPress: async () => {
                    await submitBudget();
                  },
                },
              ]
            );
            return;
          }
        }
      }

      await submitBudget();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : '予算の保存に失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  const submitBudget = async () => {
    const monthlyAmountNum = Number(periodMonthlyAmount);

    if (isEditMode && periodId) {
      await editPeriod(periodId, {
        name: periodName.trim(),
        startDate: periodStart,
        endDate: periodEnd,
        monthlyAmount: monthlyAmountNum,
        sourceAssetId: periodType !== 'income' ? sourceAssetId || undefined : undefined,
        targetAssetId: periodType !== 'expense' ? targetAssetId || undefined : undefined,
      });
      Alert.alert('成功', '予算を更新しました');
    } else {
      await addPeriod({
        type: periodType,
        name: periodName.trim(),
        startDate: periodStart,
        endDate: periodEnd,
        monthlyAmount: monthlyAmountNum,
        annualRate: 0,
        sourceAssetId:
          periodType !== 'income' ? sourceAssetId || undefined : undefined,
        targetAssetId:
          periodType !== 'expense' ? targetAssetId || undefined : undefined,
      });
      Alert.alert('成功', '予算を追加しました');
    }

    await Promise.all([refetchBudget(), fetchAssets()]);
    router.back();
  };

  const typeConfig = {
    income: {
      label: '収入',
      icon: ArrowDownCircle,
      activeColor: Colors.accent.success[600],
    },
    expense: {
      label: '支出',
      icon: ArrowUpCircle,
      activeColor: Colors.accent.error[600],
    },
    investment: {
      label: '投資',
      icon: BarChart3,
      activeColor: Colors.base.gray900,
    },
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
        <Text style={styles.headerTitle}>
          {isEditMode ? '予算を編集' : '予算を追加'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* タイプ選択（追加時のみ） */}
          {!isEditMode && (
            <View style={styles.typeSelector}>
              {(['income', 'expense', 'investment'] as BudgetType[]).map((t) => {
                const isActive = periodType === t;
                const config = typeConfig[t];
                const Icon = config.icon;

                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeButton, isActive && styles.typeButtonActive]}
                    onPress={() => setPeriodType(t)}
                  >
                    <Icon
                      size={16}
                      color={
                        isActive
                          ? config.activeColor
                          : Colors.semantic.text.tertiary
                      }
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        isActive && { color: config.activeColor },
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 予算名 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>予算名</Text>
            <TextInput
              style={styles.formInput}
              value={periodName}
              onChangeText={setPeriodName}
              placeholder="例: 給与、家賃、積立NISA"
              placeholderTextColor={Colors.semantic.text.tertiary}
            />
          </View>

          {/* 期間入力 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>開始日</Text>
            <TouchableOpacity
              style={styles.formInputButton}
              onPress={() => {
                setShowEndDatePicker(false);
                setShowStartDatePicker(!showStartDatePicker);
              }}
            >
              <Text style={styles.formInputButtonText}>
                {periodStart
                  .split('-')
                  .map((v, i) => v + ['年', '月', '日'][i])
                  .join('')}
              </Text>
              <Calendar
                size={16}
                color={Colors.semantic.text.tertiary}
              />
            </TouchableOpacity>
            {showStartDatePicker && (
              <View style={styles.datePickerContainer}>
                <RNDateTimePicker
                  value={new Date(periodStart)}
                  mode="date"
                  display="spinner"
                  locale="ja-JP"
                  onChange={(event, date) => {
                    if (event.type === 'set' && date) {
                      setPeriodStart(date.toISOString().split('T')[0]);
                      if (Platform.OS === 'android')
                        setShowStartDatePicker(false);
                    } else if (event.type === 'dismissed') {
                      setShowStartDatePicker(false);
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerCloseButton}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <Text style={styles.datePickerCloseButtonText}>完了</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>終了日</Text>
            <TouchableOpacity
              style={styles.formInputButton}
              onPress={() => {
                setShowStartDatePicker(false);
                setShowEndDatePicker(!showEndDatePicker);
              }}
            >
              <Text style={styles.formInputButtonText}>
                {periodEnd
                  .split('-')
                  .map((v, i) => v + ['年', '月', '日'][i])
                  .join('')}
              </Text>
              <Calendar
                size={16}
                color={Colors.semantic.text.tertiary}
              />
            </TouchableOpacity>
            {showEndDatePicker && (
              <View style={styles.datePickerContainer}>
                <RNDateTimePicker
                  value={new Date(periodEnd)}
                  mode="date"
                  display="spinner"
                  locale="ja-JP"
                  onChange={(event, date) => {
                    if (event.type === 'set' && date) {
                      setPeriodEnd(date.toISOString().split('T')[0]);
                      if (Platform.OS === 'android')
                        setShowEndDatePicker(false);
                    } else if (event.type === 'dismissed') {
                      setShowEndDatePicker(false);
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerCloseButton}
                    onPress={() => setShowEndDatePicker(false)}
                  >
                    <Text style={styles.datePickerCloseButtonText}>完了</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* 金額 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>毎月の金額</Text>
            <TextInput
              style={styles.formInput}
              value={periodMonthlyAmount}
              onChangeText={setPeriodMonthlyAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.semantic.text.tertiary}
            />
          </View>

          {/* 資産選択 */}
          {periodType !== 'income' && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {periodType === 'expense' ? '支払元' : '移動元'}
              </Text>
              <ScrollView style={styles.assetSelector}>
                {assets
                  .filter((a) => a.type === 'cash')
                  .map((a) => {
                    const AssetIcon =
                      a.type === 'cash' ? Banknote : BarChart3;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.yearOption,
                          sourceAssetId === a.id && styles.yearOptionSelected,
                        ]}
                        onPress={() => setSourceAssetId(a.id)}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <AssetIcon
                            size={16}
                            color={Colors.semantic.text.secondary}
                          />
                          <Text
                            style={[
                              styles.yearOptionText,
                              sourceAssetId === a.id &&
                                styles.yearOptionTextSelected,
                            ]}
                          >
                            {a.name} (¥{a.amount.toLocaleString()})
                          </Text>
                        </View>
                        {sourceAssetId === a.id && (
                          <Check size={16} color={Colors.primary[600]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {periodType !== 'expense' && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {periodType === 'income' ? '入金先' : '移動先'}
              </Text>
              <ScrollView style={styles.assetSelector}>
                {assets
                  .filter((a) =>
                    periodType === 'income' ? a.type === 'cash' : a.type === 'stock'
                  )
                  .map((a) => {
                    const AssetIcon =
                      a.type === 'cash' ? Banknote : BarChart3;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.yearOption,
                          targetAssetId === a.id && styles.yearOptionSelected,
                        ]}
                        onPress={() => setTargetAssetId(a.id)}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <AssetIcon
                            size={16}
                            color={Colors.semantic.text.secondary}
                          />
                          <Text
                            style={[
                              styles.yearOptionText,
                              targetAssetId === a.id &&
                                styles.yearOptionTextSelected,
                            ]}
                          >
                            {a.name} (¥{a.amount.toLocaleString()})
                          </Text>
                        </View>
                        {targetAssetId === a.id && (
                          <Check size={16} color={Colors.primary[600]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          )}

          {/* フリープラン制限表示 */}
          {!isPro &&
            (() => {
              const existingCount = periods.filter(
                (p) => p.type === periodType && (!isEditMode || p.id !== periodId)
              ).length;
              const typeName =
                periodType === 'income'
                  ? '収入'
                  : periodType === 'expense'
                  ? '支出'
                  : '投資';

              if (existingCount >= 1) {
                return (
                  <View style={styles.proLimitBanner}>
                    <Text style={styles.proLimitText}>
                      {typeName}予算は既に登録済みです。
                      {'\n'}複数登録するにはProプランが必要です。
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

          {/* 保存ボタン */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[
                styles.addYearButton,
                budgetLoading && styles.addYearButtonDisabled,
              ]}
              onPress={validateAndSubmit}
              disabled={budgetLoading}
            >
              <Text style={styles.addYearButtonText}>
                {budgetLoading
                  ? '保存中...'
                  : isEditMode
                  ? '更新する'
                  : '追加する'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.base.gray100,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: Colors.semantic.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  formInputButton: {
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formInputButtonText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  datePickerContainer: {
    marginTop: 8,
    backgroundColor: Colors.base.gray50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  datePickerCloseButton: {
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    backgroundColor: Colors.semantic.surface,
  },
  datePickerCloseButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  assetSelector: {
    maxHeight: 180,
    backgroundColor: Colors.base.gray50,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  yearOptionSelected: {
    backgroundColor: Colors.primary[50],
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  yearOptionText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  yearOptionTextSelected: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  proLimitBanner: {
    backgroundColor: Colors.base.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary[300],
  },
  proLimitText: {
    fontSize: 14,
    color: Colors.semantic.text.primary,
    lineHeight: 20,
  },
  addButtonContainer: {
    marginTop: 12,
  },
  addYearButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addYearButtonDisabled: {
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  addYearButtonText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

