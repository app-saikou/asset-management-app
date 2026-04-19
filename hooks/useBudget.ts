import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreateBudgetCategoryInput,
  CreateBudgetPeriodInput,
  UpdateBudgetCategoryInput,
  UpdateBudgetPeriodInput,
  UserBudgetCategory,
  UserBudgetPeriod,
} from '../types/budget';
import {
  createBudgetCategory,
  createBudgetPeriod,
  deleteBudgetCategory,
  deleteBudgetPeriod,
  fetchBudgetCategories,
  fetchBudgetPeriods,
  updateBudgetCategory,
  updateBudgetPeriod,
} from '../lib/budget';
import { useSubscription } from './useSubscription';

export function useBudget() {
  const [categories, setCategories] = useState<UserBudgetCategory[]>([]);
  const [periods, setPeriods] = useState<UserBudgetPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isPro } = useSubscription();

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cats, pers] = await Promise.all([
        fetchBudgetCategories(),
        fetchBudgetPeriods(),
      ]);
      setCategories(cats);
      setPeriods(pers);
    } catch (err: unknown) {
      console.error('予算データ取得エラー:', err);
      setError(
        err instanceof Error ? err.message : '予算データの取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Free/Pro制限: freeは収入/支出ともに1件まで
  const canAddCategory = useMemo(() => {
    if (isPro) return true;
    const incomeCount = categories.filter((c) => c.type === 'income').length;
    const expenseCount = categories.filter((c) => c.type === 'expense').length;
    return incomeCount < 1 || expenseCount < 1;
  }, [isPro, categories]);

  const addCategory = useCallback(
    async (input: CreateBudgetCategoryInput) => {
      if (!isPro) {
        const count = categories.filter((c) => c.type === input.type).length;
        if (count >= 1) {
          throw new Error('無料プランでは各カテゴリ1件までです');
        }
      }
      const created = await createBudgetCategory(input);
      setCategories((prev) => [...prev, created]);
      return created;
    },
    [isPro, categories]
  );

  const editCategory = useCallback(
    async (id: string, input: UpdateBudgetCategoryInput) => {
      const updated = await updateBudgetCategory(id, input);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    []
  );

  const removeCategory = useCallback(async (id: string) => {
    await deleteBudgetCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Periods (income/expense/investment)
  const addPeriod = useCallback(
    async (input: CreateBudgetPeriodInput) => {
      if (!isPro) {
        // 無料プランは期間1件まで（タイプ問わず合計1件 or タイプごと1件かは要件次第。ここはタイプごと1件で実装）
        const count = periods.filter((p) => p.type === input.type).length;
        if (count >= 1) {
          throw new Error('無料プランでは各タイプ1期間までです');
        }
      }
      const created = await createBudgetPeriod(input);
      setPeriods((prev) => [...prev, created]);
      return created;
    },
    [isPro, periods]
  );

  const editPeriod = useCallback(
    async (id: string, input: UpdateBudgetPeriodInput) => {
      const updated = await updateBudgetPeriod(id, input);
      setPeriods((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const removePeriod = useCallback(async (id: string) => {
    await deleteBudgetPeriod(id);
    setPeriods((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // NULLの資産参照がある予算期間をチェック
  const checkInvalidBudgetPeriods = useCallback(async (): Promise<{
    hasInvalid: boolean;
    invalidPeriods: UserBudgetPeriod[];
  }> => {
    try {
      const fetchedPeriods = await fetchBudgetPeriods();

      // 資産参照がNULLの予算期間を検出
      const invalidPeriods = fetchedPeriods.filter((period) => {
        if (period.type === 'income' && !period.target_asset_id) {
          console.log('無効な収入予算期間を検出:', period);
          return true;
        }
        if (period.type === 'expense' && !period.source_asset_id) {
          console.log('無効な支出予算期間を検出:', period);
          return true;
        }
        if (
          period.type === 'investment' &&
          (!period.source_asset_id || !period.target_asset_id)
        ) {
          console.log('無効な投資予算期間を検出:', period);
          return true;
        }
        return false;
      });

      console.log('予算期間チェック:', {
        totalPeriods: fetchedPeriods.length,
        invalidCount: invalidPeriods.length,
        invalidPeriods: invalidPeriods.map((p) => ({
          id: p.id,
          type: p.type,
          name: p.name,
          source_asset_id: p.source_asset_id,
          target_asset_id: p.target_asset_id,
        })),
      });

      return {
        hasInvalid: invalidPeriods.length > 0,
        invalidPeriods,
      };
    } catch (err: unknown) {
      console.error('予算期間チェックエラー:', err);
      return { hasInvalid: false, invalidPeriods: [] };
    }
  }, []);

  return {
    loading,
    error,
    categories,
    periods,
    canAddCategory,
    refetch: fetchAll,
    addCategory,
    editCategory,
    removeCategory,
    addPeriod,
    editPeriod,
    removePeriod,
    checkInvalidBudgetPeriods,
  };
}
