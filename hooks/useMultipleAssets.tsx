import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from 'react-native';
import { Banknote, BarChart3, Briefcase } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export type AssetType = 'cash' | 'stock';

export interface Asset {
  id: string;
  user_id: string;
  type: AssetType;
  name: string;
  amount: number;
  annual_rate: number;
  memo?: string;
  created_at: string;
  updated_at: string;
}

interface GroupedAssets {
  cash: Asset[];
  stock: Asset[];
}

export function useMultipleAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [groupedAssets, setGroupedAssets] = useState<GroupedAssets>({
    cash: [],
    stock: [],
  });
  const [totalAssets, setTotalAssets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const groupAssetsByType = useCallback((assetList: Asset[]): GroupedAssets => {
    const grouped: GroupedAssets = {
      cash: [],
      stock: [],
    };

    assetList.forEach((asset) => {
      if (asset.type === 'cash' || asset.type === 'stock') {
        grouped[asset.type].push(asset);
      }
    });

    // 各グループ内で金額の降順でソート
    grouped.cash.sort((a, b) => b.amount - a.amount);
    grouped.stock.sort((a, b) => b.amount - a.amount);

    return grouped;
  }, []);

  const calculateTotal = useCallback((assetList: Asset[]): number => {
    return assetList.reduce((total, asset) => total + asset.amount, 0);
  }, []);

  const fetchAssets = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('multiple_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const assetList = data || [];
      const newTotal = calculateTotal(assetList);
      console.log('📊 資産データ更新:', {
        資産数: assetList.length,
        総資産: newTotal.toLocaleString('ja-JP'),
      });
      setAssets(assetList);
      setGroupedAssets(groupAssetsByType(assetList));
      setTotalAssets(newTotal);
    } catch (err: any) {
      console.error('資産取得エラー:', err);
      setError(err.message || '資産の取得に失敗しました');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // groupAssetsByTypeとcalculateTotalはuseCallbackで定義されているため依存配列から除外

  const addAsset = useCallback(
    async (
      type: AssetType,
      name: string,
      amount: number,
      annualRate: number,
      memo?: string
    ) => {
      if (!user?.id) {
        Alert.alert('エラー', 'ログインしていません。');
        return;
      }

      try {
        const { data, error: addError } = await supabase
          .from('multiple_assets')
          .insert({
            user_id: user.id,
            type,
            name,
            amount,
            annual_rate: annualRate,
            memo: memo || null,
          })
          .select()
          .single();

        if (addError) {
          throw addError;
        }

        await fetchAssets(); // 資産リストを再取得
        return data;
      } catch (err: any) {
        console.error('資産追加エラー:', err);
        Alert.alert('エラー', err.message || '資産の追加に失敗しました');
      }
    },
    [user?.id, fetchAssets]
  );

  const updateAsset = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Asset, 'name' | 'amount' | 'annual_rate' | 'memo'>>
    ) => {
      if (!user?.id) {
        Alert.alert('エラー', 'ログインしていません。');
        return;
      }

      try {
        console.log('資産更新開始:', { id, updates, user_id: user.id });

        const { data, error: updateError } = await supabase
          .from('multiple_assets')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Supabase更新エラー:', updateError);
          throw updateError;
        }

        console.log('資産更新成功:', data);
        await fetchAssets(); // 資産リストを再取得
        return data;
      } catch (err: any) {
        console.error('資産更新エラー:', err);
        Alert.alert('エラー', err.message || '資産の更新に失敗しました');
      }
    },
    [user?.id, fetchAssets]
  );

  const deleteAsset = useCallback(
    async (id: string) => {
      if (!user?.id) {
        Alert.alert('エラー', 'ログインしていません。');
        return;
      }

      try {
        const { error: deleteError } = await supabase
          .from('multiple_assets')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        await fetchAssets(); // 資産リストを再取得
      } catch (err: any) {
        console.error('資産削除エラー:', err);

        // 履歴に紐づく資産はFK制約で削除不可
        if (err?.code === '23503') {
          Alert.alert(
            '削除できません',
            'この資産は履歴に紐づいています。履歴を削除するか、履歴に使われていない資産のみ削除できます。'
          );
          return;
        }

        Alert.alert('エラー', err?.message || '資産の削除に失敗しました');
      }
    },
    [user?.id, fetchAssets]
  );

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // fetchAssetsを依存配列から除外し、user?.idのみに依存

  const formatNumber = useCallback((num: number): string => {
    if (isNaN(num) || !isFinite(num) || num < 0) {
      return '0';
    }
    const safeNum = Math.round(Math.min(Math.max(num, 0), 999999999999));
    return safeNum.toLocaleString('ja-JP');
  }, []);

  const getAssetTypeIcon = useCallback((type: AssetType) => {
    switch (type) {
      case 'cash':
        return <Banknote size={24} color={Colors.accent.info[500]} />;
      case 'stock':
        return <BarChart3 size={24} color={Colors.accent.info[500]} />;
      default:
        return <Briefcase size={24} color={Colors.semantic.text.secondary} />;
    }
  }, []);

  const getAssetTypeName = useCallback((type: AssetType): string => {
    switch (type) {
      case 'cash':
        return '現金';
      case 'stock':
        return '株式';
      default:
        return '資産';
    }
  }, []);

  const getAssetPercentage = useCallback(
    (amount: number): number => {
      if (totalAssets === 0) return 0;
      return Math.round((amount / totalAssets) * 100);
    },
    [totalAssets]
  );

  // 戻り値をメモ化して無限ループを防止
  return useMemo(
    () => ({
      assets,
      groupedAssets,
      totalAssets,
      loading,
      error,
      addAsset,
      updateAsset,
      deleteAsset,
      fetchAssets,
      formatNumber,
      getAssetTypeIcon,
      getAssetTypeName,
      getAssetPercentage,
    }),
    [
      assets,
      groupedAssets,
      totalAssets,
      loading,
      error,
      addAsset,
      updateAsset,
      deleteAsset,
      fetchAssets,
      formatNumber,
      getAssetTypeIcon,
      getAssetTypeName,
      getAssetPercentage,
    ]
  );
}
