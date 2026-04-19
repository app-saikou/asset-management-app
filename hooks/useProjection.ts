import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useMultipleAssets, type Asset } from './useMultipleAssets';
import { useBudget } from './useBudget';
import { useCalculationAges } from './useAgeBasedCalculation';
import { supabase } from '../lib/supabase';
import {
  MonthlyProjectionEngine,
  saveMonthlyProjections,
  saveTargetAgeSnapshot,
  fetchMonthlyProjections,
  fetchTargetAgeSnapshots,
} from '../lib/projection';
import {
  MonthlyAssetProjection,
  TargetAgeSnapshot,
  UserBudgetPeriod,
} from '../types/budget';

export function useProjection() {
  const { user } = useAuth();
  const { fetchAssets } = useMultipleAssets();
  const { refetch: refetchBudget } = useBudget();
  const { ages } = useCalculationAges();

  const [projections, setProjections] = useState<MonthlyAssetProjection[]>([]);
  const [snapshots, setSnapshots] = useState<TargetAgeSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 月次予測を計算・保存
   */
  const calculateAndSaveProjections = useCallback(async (): Promise<
    string | null
  > => {
    if (!user?.id) return null;

    let projectionRunId: string | null = null;
    try {
      setLoading(true);
      setError(null);

      const [
        { data: assetsData, error: assetsError },
        { data: periodsData, error: periodsError },
      ] = await Promise.all([
        supabase.from('multiple_assets').select('*').eq('user_id', user.id),
        supabase.from('user_budget_periods').select('*').eq('user_id', user.id),
      ]);

      if (assetsError) {
        throw assetsError;
      }
      if (periodsError) {
        throw periodsError;
      }
      const latestAssets = (assetsData || []).map((asset) => ({
        ...asset,
        amount: Number(asset.amount ?? 0),
        annual_rate: Number(asset.annual_rate ?? 0),
      })) as Asset[];
      const latestPeriods = (periodsData || []).map((period) => ({
        ...period,
        monthly_amount: Number(period.monthly_amount ?? 0),
        annual_rate: Number(period.annual_rate ?? 0),
      })) as UserBudgetPeriod[];

      console.log('【calculateAndSaveProjections】最新資産データ:', {
        総数: latestAssets.length,
        サンプル: latestAssets.slice(0, 3).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          amount: a.amount,
        })),
      });

      if (latestAssets.length === 0) {
        console.log(
          '最新の資産データが見つからないため、予測計算をスキップします'
        );
        setLoading(false);
        return null;
      }

      if (latestPeriods.length === 0) {
        console.log(
          '最新の予算期間データが見つからないため、予測計算をスキップします'
        );
        setLoading(false);
        return null;
      }

      // 外部の状態も最新化
      await fetchAssets();
      await refetchBudget();

      // 現在から100歳まで（または5年後まで）の予測を計算
      const currentDate = new Date();

      // プロフィールから生年月日を先に取得（エンジンに渡すため）
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('birth_date')
        .eq('user_id', user.id)
        .single();

      // エンジンを初期化（birthDateを渡して正確な年齢計算を行う）
      const engine = new MonthlyProjectionEngine(
        user.id,
        latestAssets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          amount: asset.amount,
          annualRate: Number(asset.annual_rate ?? 0),
        })),
        latestPeriods,
        currentDate,
        profile?.birth_date ?? undefined
      );
      const startMonth = currentDate.toISOString().slice(0, 7) + '-01';

      let endMonth: string;
      if (profile?.birth_date) {
        const birthDate = new Date(profile.birth_date);
        const hundredYear = birthDate.getFullYear() + 100;
        const birthMonth = birthDate.getMonth();
        const targetMonthDate = new Date(hundredYear, birthMonth, 1);
        const finalYear = targetMonthDate.getFullYear();
        const finalMonth = targetMonthDate.getMonth() + 1;
        endMonth = `${finalYear}-${String(finalMonth).padStart(2, '0')}-01`;
      } else {
        // 生年月日がない場合は5年後まで
        const fiveYearLater = new Date(
          currentDate.getFullYear() + 5,
          currentDate.getMonth() + 1,
          1
        );
        const year = fiveYearLater.getFullYear();
        const month = fiveYearLater.getMonth() + 1;
        endMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      }

      console.log('月次予測を計算中...', { startMonth, endMonth });
      const newProjections = engine.calculateMultiMonthProjection(
        startMonth,
        endMonth
      );

      const { data: runRow, error: runError } = await supabase
        .from('projection_runs')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (runError || !runRow?.id) {
        throw runError || new Error('投影ランの作成に失敗しました');
      }

      projectionRunId = runRow.id;

      // データベースに保存
      await saveMonthlyProjections(newProjections, projectionRunId);
      console.log('月次予測を保存しました:', newProjections.length, '件');

      // 目標年齢スナップショットを計算・保存
      if (ages.length > 0) {
        console.log('目標年齢スナップショットを計算中...');
        const newSnapshots = ages.map((age) =>
          engine.calculateTargetAgeSnapshot(age.target_age)
        );

        await Promise.all(
          newSnapshots.map((snapshot) => saveTargetAgeSnapshot(snapshot))
        );
        console.log(
          'スナップショットを保存しました:',
          newSnapshots.length,
          '件'
        );
      }

      // データを再取得
      await fetchProjections();
      await fetchSnapshots();

      return projectionRunId;
    } catch (err) {
      console.error('予測計算エラー:', err);
      setError(err instanceof Error ? err.message : '予測の計算に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, ages, fetchAssets, refetchBudget]);

  /**
   * 月次予測を取得
   */
  const fetchProjections = useCallback(
    async (startMonth?: string, endMonth?: string) => {
      if (!user?.id) return;

      try {
        const data = await fetchMonthlyProjections(
          user.id,
          startMonth,
          endMonth
        );
        setProjections(data);
      } catch (err) {
        console.error('予測取得エラー:', err);
        setError(
          err instanceof Error ? err.message : '予測の取得に失敗しました'
        );
      }
    },
    [user?.id]
  );

  /**
   * スナップショットを取得
   */
  const fetchSnapshots = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await fetchTargetAgeSnapshots(user.id);
      setSnapshots(data);
    } catch (err) {
      console.error('スナップショット取得エラー:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'スナップショットの取得に失敗しました'
      );
    }
  }, [user?.id]);

  /**
   * 初期データ読み込み
   */
  useEffect(() => {
    if (user?.id) {
      fetchProjections();
      fetchSnapshots();
    }
  }, [user?.id, fetchProjections, fetchSnapshots]);

  /**
   * 資産・期間データが変更されたら予測を再計算（無効化）
   * 手動でのみ実行するように変更
   */
  // useEffect(() => {
  //   if (user?.id && assets.length > 0 && periods.length > 0) {
  //     console.log('資産・期間データが変更されました。予測を再計算します。');
  //     calculateAndSaveProjections();
  //   }
  // }, [user?.id, assets, periods, calculateAndSaveProjections]);

  /**
   * 特定の月の予測を取得
   */
  const getProjectionForMonth = useCallback(
    (monthYear: string) => {
      return projections.filter((p) => p.month_year === monthYear);
    },
    [projections]
  );

  /**
   * 特定の資産の予測を取得
   */
  const getProjectionForAsset = useCallback(
    (assetId: string) => {
      return projections.filter((p) => p.asset_id === assetId);
    },
    [projections]
  );

  /**
   * 特定の目標年齢のスナップショットを取得
   */
  const getSnapshotForAge = useCallback(
    (targetAge: number) => {
      return snapshots.find((s) => s.target_age === targetAge);
    },
    [snapshots]
  );

  return {
    projections,
    snapshots,
    loading,
    error,
    calculateAndSaveProjections,
    fetchProjections,
    fetchSnapshots,
    getProjectionForMonth,
    getProjectionForAsset,
    getSnapshotForAge,
  };
}
