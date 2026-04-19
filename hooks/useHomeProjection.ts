import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { MonthlyProjectionEngine } from '../lib/projection';
import { UserBudgetPeriod } from '../types/budget';
import { CalculationAgeDisplay } from '../types/ageBasedCalculation';
import type { Asset } from './useMultipleAssets';

export interface HomeProjectionResult {
  targetAge: number;
  futureValue: number;
  increaseAmount: number;
  yearsToTarget: number;
  targetAmount: number | null | undefined;
}

/**
 * ホーム画面用の将来予測をオンザフライで計算する hook。
 * MonthlyProjectionEngine（月次複利・予算込み）を使い、DB には書き込まない。
 * 資産や予算が変わるたびに自動再計算される。
 */
export function useHomeProjection(
  assets: Asset[],
  ages: CalculationAgeDisplay[]
): {
  result: HomeProjectionResult | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [result, setResult] = useState<HomeProjectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || assets.length === 0 || ages.length === 0) {
      setResult(null);
      return;
    }

    let cancelled = false;

    const calculate = async () => {
      setLoading(true);
      try {
        const [{ data: periodsData }, { data: profileData }] =
          await Promise.all([
            supabase
              .from('user_budget_periods')
              .select('*')
              .eq('user_id', user.id),
            supabase
              .from('user_profiles')
              .select('birth_date')
              .eq('user_id', user.id)
              .single(),
          ]);

        if (cancelled) return;

        const budgetPeriods = (periodsData || []).map((p) => ({
          ...p,
          monthly_amount: Number(p.monthly_amount ?? 0),
          annual_rate: Number(p.annual_rate ?? 0),
        })) as UserBudgetPeriod[];

        const primaryAge = ages[0];

        const engine = new MonthlyProjectionEngine(
          user.id,
          assets.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            amount: a.amount,
            annualRate: Number(a.annual_rate ?? 0),
          })),
          budgetPeriods,
          new Date(),
          profileData?.birth_date ?? undefined
        );

        const snapshot = engine.calculateTargetAgeSnapshot(primaryAge.target_age);
        const currentTotal = assets.reduce((sum, a) => sum + a.amount, 0);

        if (cancelled) return;

        setResult({
          targetAge: snapshot.target_age,
          futureValue: snapshot.total_balance,
          increaseAmount: snapshot.total_balance - currentTotal,
          yearsToTarget: snapshot.years_from_now,
          targetAmount: primaryAge.target_amount,
        });
      } catch {
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    calculate();

    return () => {
      cancelled = true;
    };
  }, [user?.id, assets, ages]);

  return { result, loading };
}
