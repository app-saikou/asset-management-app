import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AssetHistoryItem {
  id: string;
  date: string;
  current_assets: number;
  annual_rate: number;
  years: number;
  future_value: number;
  increase_amount: number;
  created_at: string;
}

export interface GroupedHistory {
  [key: string]: AssetHistoryItem[];
}

export const useAssetHistory = () => {
  const [history, setHistory] = useState<AssetHistoryItem[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // 履歴データを取得
  const fetchHistory = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('asset_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const historyData = data || [];
      setHistory(historyData);
      setGroupedHistory(groupHistoryByMonth(historyData));
    } catch (err: any) {
      console.error('履歴取得エラー:', err);
      setError(err.message || '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 履歴を保存
  const saveHistory = async (
    currentAssets: number,
    annualRate: number,
    years: number,
    futureValue: number
  ) => {
    if (!user?.id) return;

    try {
      const increaseAmount = futureValue - currentAssets;

      const { error: insertError } = await supabase
        .from('asset_history')
        .insert([
          {
            user_id: user.id,
            current_assets: currentAssets,
            annual_rate: annualRate,
            years: years,
            future_value: futureValue,
            increase_amount: increaseAmount,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      // 履歴を再取得
      await fetchHistory();
    } catch (err: any) {
      console.error('履歴保存エラー:', err);
      setError(err.message || '履歴の保存に失敗しました');
    }
  };

  // 履歴を削除
  const deleteHistory = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('asset_history')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // 履歴を再取得
      await fetchHistory();
    } catch (err: any) {
      console.error('履歴削除エラー:', err);
      setError(err.message || '履歴の削除に失敗しました');
    }
  };

  // 月単位でグループ化
  const groupHistoryByMonth = (
    historyData: AssetHistoryItem[]
  ): GroupedHistory => {
    const grouped: GroupedHistory = {};

    historyData.forEach((item) => {
      const date = new Date(item.created_at);
      const now = new Date();

      let key: string;

      // 今月かどうかを判定
      if (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      ) {
        key = '今月';
      } else {
        key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  // 数値フォーマット
  const formatNumber = (num: number): string => {
    if (isNaN(num) || !isFinite(num) || num < 0) {
      return '0';
    }

    const safeNum = Math.min(Math.max(num, 0), 999999999999);
    return Math.floor(safeNum)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 初回読み込み
  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  return {
    history,
    groupedHistory,
    loading,
    error,
    saveHistory,
    deleteHistory,
    fetchHistory,
    formatNumber,
  };
};
