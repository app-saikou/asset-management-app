import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type MonthStatus = {
  year: number;
  month: number;
  hasUpdate: boolean;
  label: string;
};

export type StreakResult = {
  streak: number;
  months: MonthStatus[];
  hasAnyHistory: boolean;
};

function buildMonths(updatedMonths: Set<string>, now: Date): MonthStatus[] {
  const months: MonthStatus[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      hasUpdate: updatedMonths.has(key),
      label: `${d.getMonth() + 1}月`,
    });
  }
  return months;
}

function calcStreak(updatedMonths: Set<string>, now: Date): number {
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // 今月未更新なら先月から遡る
  const startOffset = updatedMonths.has(currentKey) ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i < 200; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (updatedMonths.has(key)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function useStreak() {
  const [result, setResult] = useState<StreakResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStreak = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('asset_history')
      .select('created_at')
      .eq('user_id', user.id);

    const now = new Date();

    if (!data || data.length === 0) {
      setResult({ streak: 0, months: buildMonths(new Set(), now), hasAnyHistory: false });
      setLoading(false);
      return;
    }

    const updatedMonths = new Set(
      data.map(r => {
        const d = new Date(r.created_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })
    );

    setResult({
      streak: calcStreak(updatedMonths, now),
      months: buildMonths(updatedMonths, now),
      hasAnyHistory: true,
    });
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return { result, loading, fetchStreak };
}
