import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AssetData {
  id?: string;
  user_id: string;
  current_assets: number;
  created_at?: string;
  updated_at?: string;
}

export const useAssets = () => {
  const [currentAssets, setCurrentAssets] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // 資産データを取得
  const fetchAssets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116は「データが見つからない」エラー
        throw error;
      }

      if (data) {
        setCurrentAssets(data.current_assets);
      }
    } catch (err) {
      console.error('資産データの取得エラー:', err);
      setError('資産データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 資産データを保存・更新
  const saveAssets = async (assets: number) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // 既存データがあるかチェック
      const { data: existingData } = await supabase
        .from('user_assets')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (existingData) {
        // 更新
        const { error } = await supabase
          .from('user_assets')
          .update({
            current_assets: assets,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // 新規作成
        const { error } = await supabase.from('user_assets').insert({
          user_id: user.id,
          current_assets: assets,
        });

        if (error) throw error;
      }

      setCurrentAssets(assets);
    } catch (err) {
      console.error('資産データの保存エラー:', err);
      setError('資産データの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ユーザーが変更されたときにデータを取得
  useEffect(() => {
    if (user) {
      fetchAssets();
    } else {
      setCurrentAssets(0);
      setLoading(false);
    }
  }, [user]);

  return {
    currentAssets,
    loading,
    error,
    saveAssets,
    refreshAssets: fetchAssets,
  };
};
