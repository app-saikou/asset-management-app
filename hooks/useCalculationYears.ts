import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import {
  getUserCalculationYears,
  addCalculationYear,
  removeCalculationYear,
  updateCalculationYear,
  reorderCalculationYears,
  canAddCalculationYear,
  getUserCalculationYearsCount,
} from '../lib/calculationYears';
import type {
  UseCalculationYearsReturn,
  CalculationYearDisplay,
} from '../types/calculationYears';
import { YEAR_LIMITS } from '../types/calculationYears';

export function useCalculationYears(): UseCalculationYearsReturn {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [years, setYears] = useState<CalculationYearDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState(1);

  // 最大年数設定数を取得
  const maxCount = isPro ? YEAR_LIMITS.pro : YEAR_LIMITS.free;

  // 年数設定を追加できるかチェック
  const canAddMore = currentCount < maxCount;

  // 年数設定を取得
  const fetchYears = useCallback(async () => {
    if (!user) {
      setYears([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [yearsData, count] = await Promise.all([
        getUserCalculationYears(user.id),
        getUserCalculationYearsCount(user.id),
      ]);

      setYears(yearsData);
      setCurrentCount(count);
    } catch (err) {
      console.error('Error fetching calculation years:', err);
      setError(
        err instanceof Error ? err.message : '年数設定の取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 年数設定を追加
  const addYear = useCallback(
    async (yearNumber: number) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      if (!canAddMore) {
        throw new Error('年数設定の上限に達しています');
      }

      try {
        setError(null);
        await addCalculationYear(user.id, yearNumber);
        await fetchYears(); // 再取得
      } catch (err) {
        console.error('Error adding calculation year:', err);
        setError(
          err instanceof Error ? err.message : '年数設定の追加に失敗しました'
        );
        throw err;
      }
    },
    [user, canAddMore, fetchYears]
  );

  // 年数設定を削除
  const removeYear = useCallback(
    async (id: string) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      try {
        setError(null);
        await removeCalculationYear(user.id, id);
        await fetchYears(); // 再取得
      } catch (err) {
        console.error('Error removing calculation year:', err);
        setError(
          err instanceof Error ? err.message : '年数設定の削除に失敗しました'
        );
        throw err;
      }
    },
    [user, fetchYears]
  );

  // 年数設定を更新
  const updateYear = useCallback(
    async (id: string, yearNumber: number) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      try {
        setError(null);
        await updateCalculationYear(user.id, id, yearNumber);
        await fetchYears(); // 再取得
      } catch (err) {
        console.error('Error updating calculation year:', err);
        setError(
          err instanceof Error ? err.message : '年数設定の更新に失敗しました'
        );
        throw err;
      }
    },
    [user, fetchYears]
  );

  // 年数設定の順序を更新
  const reorderYears = useCallback(
    async (newYears: CalculationYearDisplay[]) => {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      try {
        setError(null);
        await reorderCalculationYears(user.id, newYears);
        setYears(newYears); // ローカル状態を更新
      } catch (err) {
        console.error('Error reordering calculation years:', err);
        setError(
          err instanceof Error
            ? err.message
            : '年数設定の並び替えに失敗しました'
        );
        throw err;
      }
    },
    [user]
  );

  // 初回読み込み
  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  // プラン変更時に再取得
  useEffect(() => {
    if (user) {
      fetchYears();
    }
  }, [isPro, user, fetchYears]);

  return {
    years,
    isLoading,
    error,
    canAddMore,
    maxCount,
    currentCount,
    addYear,
    removeYear,
    updateYear,
    reorderYears,
  };
}
