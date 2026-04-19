import { supabase } from './supabase';
import type {
  CalculationYear,
  CalculationYearDisplay,
  MultiYearCalculationResult,
} from '../types/calculationYears';
import {
  DEFAULT_CALCULATION_YEARS,
  YEAR_LIMITS,
} from '../types/calculationYears';

// ユーザーの年数設定を取得
export async function getUserCalculationYears(
  userId: string
): Promise<CalculationYearDisplay[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_calculation_years', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error fetching calculation years:', error);
      return DEFAULT_CALCULATION_YEARS;
    }

    if (!data || data.length === 0) {
      return DEFAULT_CALCULATION_YEARS;
    }

    return data.map((item: any) => ({
      id: item.id,
      year_number: item.year_number,
      is_active: item.is_active,
      display_order: item.display_order,
    }));
  } catch (error) {
    console.error('Error fetching calculation years:', error);
    return DEFAULT_CALCULATION_YEARS;
  }
}

// 年数設定を追加
export async function addCalculationYear(
  userId: string,
  yearNumber: number
): Promise<void> {
  try {
    // 制限チェック
    const canAdd = await canAddCalculationYear(userId);
    if (!canAdd) {
      throw new Error('年数設定の上限に達しています');
    }

    // 既存の年数設定数を取得してdisplay_orderを設定
    const existingYears = await getUserCalculationYears(userId);
    const nextOrder =
      Math.max(...existingYears.map((y) => y.display_order), 0) + 1;

    const { error } = await supabase.from('user_calculation_years').insert({
      user_id: userId,
      year_number: yearNumber,
      is_active: true,
      display_order: nextOrder,
    });

    if (error) {
      console.error('Error adding calculation year:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error adding calculation year:', error);
    throw error;
  }
}

// 年数設定を削除（最低1つ制限付き）
export async function removeCalculationYear(
  userId: string,
  yearId: string
): Promise<void> {
  try {
    // 最低1つ制限チェック付きで削除
    const { data, error } = await supabase.rpc('safe_remove_calculation_year', {
      user_uuid: userId,
      year_id: yearId,
    });

    if (error) {
      console.error('Error removing calculation year:', error);
      throw new Error(error.message || '年数設定の削除に失敗しました');
    }

    if (!data) {
      throw new Error('年数設定の削除に失敗しました');
    }
  } catch (error) {
    console.error('Error removing calculation year:', error);
    throw error;
  }
}

// 年数設定を更新
export async function updateCalculationYear(
  userId: string,
  yearId: string,
  yearNumber: number
): Promise<void> {
  try {
    // 年数設定を直接更新
    const { error } = await supabase
      .from('user_calculation_years')
      .update({
        year_number: yearNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', yearId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating calculation year:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating calculation year:', error);
    throw error;
  }
}

// 年数設定の順序を更新
export async function reorderCalculationYears(
  userId: string,
  years: CalculationYearDisplay[]
): Promise<void> {
  try {
    const updates = years.map((year, index) => ({
      id: year.id,
      display_order: index + 1,
    }));

    for (const update of updates) {
      if (update.id !== 'default') {
        const { error } = await supabase
          .from('user_calculation_years')
          .update({
            display_order: update.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id)
          .eq('user_id', userId);

        if (error) {
          console.error('Error reordering calculation years:', error);
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error reordering calculation years:', error);
    throw error;
  }
}

// 年数設定を追加できるかチェック（最低1つ制限考慮）
export async function canAddCalculationYear(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'can_add_calculation_year_with_minimum',
      {
        user_uuid: userId,
      }
    );

    if (error) {
      console.error('Error checking calculation year limit:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error checking calculation year limit:', error);
    return false;
  }
}

// ユーザーの年数設定数を取得（最低1つ制限考慮）
export async function getUserCalculationYearsCount(
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc(
      'get_user_calculation_years_count_with_minimum',
      {
        user_uuid: userId,
      }
    );

    if (error) {
      console.error('Error getting calculation years count:', error);
      return 1; // 最低1つ保証
    }

    return data || 1;
  } catch (error) {
    console.error('Error getting calculation years count:', error);
    return 1;
  }
}

// 複数年数での計算結果を取得
export async function calculateMultiYearResults(
  userId: string,
  assets: Array<{ type: string; amount: number }>,
  rates: Record<string, number>
): Promise<MultiYearCalculationResult> {
  try {
    const years = await getUserCalculationYears(userId);
    const currentAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);

    const results = years.map((year) => {
      let futureValue = 0;
      for (const asset of assets) {
        const assetRate = rates[asset.type] || 0;
        const assetFutureValue = Math.round(
          asset.amount * Math.pow(1 + assetRate / 100, year.year_number)
        );
        futureValue += assetFutureValue;
      }

      const increaseAmount = Math.round(futureValue - currentAssets);
      const averageRate =
        assets.length > 0
          ? assets.reduce((sum, asset) => sum + (rates[asset.type] || 0), 0) /
            assets.length
          : 0;

      return {
        year: year.year_number,
        futureValue,
        increaseAmount,
        averageRate,
      };
    });

    return {
      currentAssets,
      results,
    };
  } catch (error) {
    console.error('Error calculating multi-year results:', error);
    throw error;
  }
}
