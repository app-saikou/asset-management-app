import { supabase } from './supabase';
import { getUserCurrentAgeMonth } from './ageBasedCalculation';

export interface TargetAgeCheckResult {
  isValid: boolean;
  currentAge: number;
  currentMonth: number;
  targetAge: number;
  targetMonth: number;
  needsUpdate: boolean;
}

/**
 * 現在年齢と目標年齢をチェックし、目標年齢の更新が必要かどうかを判定
 */
export async function checkTargetAgeValidity(
  userId: string
): Promise<TargetAgeCheckResult> {
  try {
    // 現在年齢+月を取得
    const currentAgeMonth = await getUserCurrentAgeMonth(userId);
    if (!currentAgeMonth) {
      throw new Error('現在年齢を取得できませんでした');
    }

    // 目標年齢設定を取得
    // target_monthカラムが存在しない可能性があるため、target_ageのみ取得
    const { data: targetAges, error } = await supabase
      .from('user_calculation_ages')
      .select('target_age')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!targetAges || targetAges.length === 0) {
      throw new Error('目標年齢が設定されていません');
    }

    const targetAge = targetAges[0].target_age;
    // target_monthカラムが存在しない場合は0をデフォルト値として使用
    const targetMonth = (targetAges[0] as any).target_month ?? 0;

    // 現在年齢+月と目標年齢+月を比較
    const currentTotalMonths = currentAgeMonth.age * 12 + currentAgeMonth.month;
    const targetTotalMonths = targetAge * 12 + targetMonth;

    const needsUpdate = targetTotalMonths <= currentTotalMonths;

    return {
      isValid: !needsUpdate,
      currentAge: currentAgeMonth.age,
      currentMonth: currentAgeMonth.month,
      targetAge,
      targetMonth,
      needsUpdate,
    };
  } catch (error) {
    console.error('Error checking target age validity:', error);
    throw error;
  }
}

/**
 * 目標年齢を更新
 */
export async function updateTargetAge(
  userId: string,
  newTargetAge: number,
  newTargetMonth: number = 0
): Promise<void> {
  try {
    // 既存の目標年齢を更新
    // target_monthカラムが存在しない場合は更新しない
    const updateData: any = {
      target_age: newTargetAge,
      updated_at: new Date().toISOString(),
    };

    // target_monthカラムが存在する場合のみ更新（エラーを避けるため）
    // 実際のデータベースにカラムが存在するかどうかは実行時に確認
    try {
      const { error } = await supabase
        .from('user_calculation_ages')
        .update({
          ...updateData,
          target_month: newTargetMonth,
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        // target_monthカラムが存在しない場合は、target_monthなしで再試行
        if (error.code === '42703') {
          const { error: retryError } = await supabase
            .from('user_calculation_ages')
            .update(updateData)
            .eq('user_id', userId)
            .eq('is_active', true);

          if (retryError) {
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      // target_monthカラムが存在しない場合は、target_monthなしで更新
      if (error?.code === '42703') {
        const { error: retryError } = await supabase
          .from('user_calculation_ages')
          .update(updateData)
          .eq('user_id', userId)
          .eq('is_active', true);

        if (retryError) {
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error updating target age:', error);
    throw error;
  }
}

/**
 * 推奨目標年齢を計算（現在年齢+5歳）
 */
export function getRecommendedTargetAge(currentAge: number): number {
  return Math.min(currentAge + 5, 100);
}
