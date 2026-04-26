import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AssetHistoryDetail {
  id: string;
  asset_id: string | null;
  asset_name: string;
  asset_type: 'cash' | 'stock';
  original_amount: number;
  adjusted_amount: number;
  annual_rate: number;
  future_value: number;
  increase_amount: number;
}

export interface AssetHistoryItem {
  id: string;
  date: string;
  current_assets: number;
  annual_rate: number;
  years: number;
  target_month: number | null;
  future_value: number;
  increase_amount: number;
  created_at: string;
  projection_run_id?: string | null;
  asset_history_details?: AssetHistoryDetail[];
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
  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('asset_history')
        .select(
          `
          *,
          asset_history_details(*)
        `
        )
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
  }, [user?.id]);

  // 履歴を保存
  const saveHistory = async (
    currentAssets: number,
    annualRate: number,
    years: number,
    futureValue: number,
    assetDetails?: Array<{
      id: string;
      name: string;
      type: 'cash' | 'stock';
      originalAmount: number;
      adjustedAmount: number;
      annualRate: number;
    }>,
    projectionRunId?: string | null,
    assetProjections?: Map<string, number>,
    targetMonth?: number | null
  ) => {
    if (!user?.id) return;

    try {
      const increaseAmount = futureValue - currentAssets;

      // メイン履歴を保存
      const { data: historyData, error: insertError } = await supabase
        .from('asset_history')
        .insert([
          {
            user_id: user.id,
            current_assets: currentAssets,
            annual_rate: annualRate,
            years: years,
            target_month: targetMonth ?? null,
            future_value: futureValue,
            increase_amount: increaseAmount,
            projection_run_id: projectionRunId ?? null,
          },
        ])
        .select()
        .single();

      if (insertError || !historyData) {
        throw insertError;
      }

      // 資産詳細データがある場合は保存
      if (assetDetails && assetDetails.length > 0) {
        const detailsToInsert = assetDetails.map((asset) => {
          const assetFutureValue = assetProjections?.has(asset.id)
            ? Math.round(assetProjections.get(asset.id)!)
            : Math.round(asset.adjustedAmount * Math.pow(1 + asset.annualRate / 100, years));
          const assetIncreaseAmount = assetFutureValue - asset.adjustedAmount;

          return {
            history_id: historyData.id,
            asset_id: asset.id,
            asset_name: asset.name,
            asset_type: asset.type,
            original_amount: asset.originalAmount,
            adjusted_amount: asset.adjustedAmount,
            annual_rate: asset.annualRate ?? 0, // null/undefinedの場合は0を設定
            future_value: assetFutureValue,
            increase_amount: assetIncreaseAmount,
          };
        });

        const { error: detailsError } = await supabase
          .from('asset_history_details')
          .insert(detailsToInsert);

        if (detailsError) {
          console.error('資産詳細保存エラー:', detailsError);
          // 詳細保存エラーでも履歴は保存済みなので継続
        }
      }

      if (projectionRunId && historyData?.id) {
        const [{ error: runLinkError }, { error: historyUpdateError }] =
          await Promise.all([
            supabase
              .from('projection_runs')
              .update({ history_id: historyData.id })
              .eq('id', projectionRunId),
            supabase
              .from('asset_history')
              .update({ projection_run_id: projectionRunId })
              .eq('id', historyData.id),
          ]);

        if (runLinkError) {
          console.error('投影ラン更新エラー:', runLinkError);
        }
        if (historyUpdateError) {
          console.error('履歴への投影ラン紐付けエラー:', historyUpdateError);
        }
      }

      // 履歴を再取得
      await fetchHistory();

      // 保存した履歴のIDを返す
      return historyData?.id;
    } catch (err: any) {
      console.error('履歴保存エラー:', err);
      setError(err.message || '履歴の保存に失敗しました');
      return null;
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
    return Math.round(safeNum).toLocaleString('ja-JP');
  };

  // 初回読み込みのみ
  useEffect(() => {
    if (!user?.id) return;

    // 初回データ取得のみ
    fetchHistory();
  }, [user?.id, fetchHistory]);

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
