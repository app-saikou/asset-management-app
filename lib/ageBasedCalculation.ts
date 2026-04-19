import { supabase } from './supabase';
import { getUserSubscriptionStatus } from './subscription';
import type {
  UserProfile,
  CalculationAge,
  CalculationAgeDisplay,
  AgeCalculationResult,
  CreateUserProfileData,
  CreateCalculationAgeData,
  UpdateCalculationAgeData,
  ReorderCalculationAgesData,
} from '../types/ageBasedCalculation';
import {
  DEFAULT_CALCULATION_AGES,
  AGE_LIMITS,
  MIN_AGE,
  MAX_AGE,
} from '../types/ageBasedCalculation';
import type { AssetType, DefaultInterestRates } from '../types/subscription';

// ユーザープロフィール関連の関数

// ユーザープロフィールを取得
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// ユーザープロフィールを作成（upsert方式: 既存なら更新、なければ新規作成）
// 改善: 一意制約エラー(23505)を防ぐため、insertではなくupsertを使用
// これにより、onComplete()の多重発火時でも重複INSERTが発生しない
export async function createUserProfile(
  userId: string,
  profileData: CreateUserProfileData
): Promise<UserProfile | null> {
  try {
    const upsertData: any = {
      user_id: userId,
      birth_date: profileData.birth_date,
    };

    // nameが提供されている場合は追加
    if (profileData.name !== undefined) {
      upsertData.name = profileData.name;
    }

    // onboarding_completedが提供されている場合は追加
    if (profileData.onboarding_completed !== undefined) {
      upsertData.onboarding_completed = profileData.onboarding_completed;
    }

    // upsertを使用: user_idが既存なら更新、なければ新規作成
    // onConflictでuser_idを指定することで、同じユーザーで複数回呼ばれてもエラーにならない
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(upsertData, {
        onConflict: 'user_id',
        // 既存レコードがある場合、指定されたフィールドのみを更新
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
}

// ユーザープロフィールを更新
export async function updateUserProfile(
  userId: string,
  profileData: CreateUserProfileData
): Promise<UserProfile | null> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // birth_dateが提供されている場合は追加
    if (profileData.birth_date !== undefined) {
      updateData.birth_date = profileData.birth_date;
    }

    // nameが提供されている場合は追加
    if (profileData.name !== undefined) {
      updateData.name = profileData.name;
    }

    // onboarding_completedが提供されている場合は追加
    if (profileData.onboarding_completed !== undefined) {
      updateData.onboarding_completed = profileData.onboarding_completed;
    }

    // notification_enabledが提供されている場合は追加
    if (profileData.notification_enabled !== undefined) {
      updateData.notification_enabled = profileData.notification_enabled;
    }

    // notification_dayが提供されている場合は追加
    if (profileData.notification_day !== undefined) {
      updateData.notification_day = profileData.notification_day;
    }

    // notification_hourが提供されている場合は追加
    if (profileData.notification_hour !== undefined) {
      updateData.notification_hour = profileData.notification_hour;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// ユーザーの現在年齢を取得
export async function getUserCurrentAge(
  userId: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_current_age', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error getting user current age:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user current age:', error);
    return null;
  }
}

// ユーザーの現在年齢+月を取得
export async function getUserCurrentAgeMonth(
  userId: string
): Promise<{ age: number; month: number } | null> {
  try {
    console.log('getUserCurrentAgeMonth called with userId:', userId);

    // まず生年月日が存在するかチェック
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('birth_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return null;
    }

    if (!profileData || !profileData.birth_date) {
      console.log('No birth date found for user:', userId);
      return null;
    }

    console.log('Found birth date:', profileData.birth_date);

    // RPC関数の代わりに直接計算
    const birthDate = new Date(profileData.birth_date);
    const currentDate = new Date();

    let age = currentDate.getFullYear() - birthDate.getFullYear();
    let month = currentDate.getMonth() - birthDate.getMonth();

    // 誕生日がまだ来ていない場合は年齢を1つ減らす
    if (
      month < 0 ||
      (month === 0 && currentDate.getDate() < birthDate.getDate())
    ) {
      age--;
      month += 12;
    }

    // 日付がまだ来ていない場合は月数を1つ減らす
    if (currentDate.getDate() < birthDate.getDate()) {
      month--;
    }

    console.log('Calculated age and month:', { age, month });

    return { age, month };
  } catch (error) {
    console.error('Error getting user current age and month:', error);
    return null;
  }
}

// 年齢ベース計算設定関連の関数

// ユーザーの年齢ベース計算設定を取得
export async function getUserCalculationAges(
  userId: string
): Promise<CalculationAgeDisplay[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_calculation_ages', {
      user_uuid: userId,
    });

    if (error) {
      console.error('Error fetching calculation ages:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      // ユーザーに年齢設定がない場合、デフォルトの65歳を返す
      return DEFAULT_CALCULATION_AGES;
    }

    if (__DEV__) {
      console.log(
        '[getUserCalculationAges] raw data:',
        JSON.stringify(data, null, 2)
      );
      data.forEach((age: any) => {
        console.log(
          `[getUserCalculationAges] raw - id: ${age.id}, target_age: ${
            age.target_age
          }, target_month: ${
            age.target_month
          } (type: ${typeof age.target_month}), target_amount: ${
            age.target_amount
          }`
        );
      });
    }

    // 型変換を明示的に行う
    const transformed = data.map((age: any) => {
      const transformedAge = {
        id: age.id,
        target_age: Number(age.target_age) || 65,
        target_month:
          age.target_month !== null && age.target_month !== undefined
            ? Number(age.target_month)
            : 0,
        target_amount:
          age.target_amount !== null && age.target_amount !== undefined
            ? Number(age.target_amount)
            : null,
        is_active: Boolean(age.is_active),
        display_order: Number(age.display_order) || 0,
      };

      if (__DEV__) {
        console.log(
          `[getUserCalculationAges] transformed - id: ${
            transformedAge.id
          }, target_age: ${transformedAge.target_age}, target_month: ${
            transformedAge.target_month
          } (type: ${typeof transformedAge.target_month}), target_amount: ${
            transformedAge.target_amount
          }`
        );
      }

      return transformedAge;
    });

    return transformed;
  } catch (error) {
    console.error('Error fetching calculation ages:', error);
    throw error;
  }
}

// 年齢+月ベース計算設定を追加
export async function addCalculationAge(
  userId: string,
  targetAge: number,
  targetMonth: number,
  targetAmount?: number | null
): Promise<void> {
  try {
    // 年齢の妥当性チェック
    if (targetAge < MIN_AGE || targetAge > MAX_AGE) {
      throw new Error(
        `年齢は${MIN_AGE}歳から${MAX_AGE}歳の間で設定してください。`
      );
    }

    if (targetMonth < 0 || targetMonth > 11) {
      throw new Error('月は0から11の間で設定してください。');
    }

    const canAdd = await canAddCalculationAge(userId);
    if (!canAdd) {
      throw new Error('年齢設定の上限に達しています。');
    }

    // 現在年齢+月を取得してチェック
    const currentAgeMonth = await getUserCurrentAgeMonth(userId);
    if (currentAgeMonth) {
      const currentTotalMonths =
        currentAgeMonth.age * 12 + currentAgeMonth.month;
      const targetTotalMonths = targetAge * 12 + targetMonth;

      if (targetTotalMonths <= currentTotalMonths) {
        throw new Error('目標年齢は現在の年齢より大きく設定してください。');
      }
    }

    // 既存の年齢設定数を取得してdisplay_orderを設定
    const existingAges = await getUserCalculationAges(userId);
    const nextOrder =
      Math.max(...existingAges.map((age) => age.display_order), 0) + 1;

    const insertData: {
      user_id: string;
      target_age: number;
      target_month: number;
      is_active: boolean;
      display_order: number;
      target_amount?: number | null;
    } = {
      user_id: userId,
      target_age: targetAge,
      target_month: targetMonth,
      is_active: true,
      display_order: nextOrder,
    };

    // 目標額が指定されている場合は追加
    if (targetAmount !== undefined) {
      insertData.target_amount = targetAmount;
    }

    const { error } = await supabase
      .from('user_calculation_ages')
      .insert(insertData);

    if (error) {
      console.error('Error adding calculation age:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error adding calculation age:', error);
    throw error;
  }
}

// 年齢ベース計算設定を削除（最低1つ制限付き）
export async function removeCalculationAge(
  userId: string,
  ageId: string
): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('safe_remove_calculation_age', {
      user_uuid: userId,
      age_id: ageId,
    });

    if (error) {
      console.error('Error removing calculation age:', error);
      throw new Error(error.message || '年齢設定の削除に失敗しました');
    }

    if (!data) {
      throw new Error('年齢設定の削除に失敗しました');
    }
  } catch (error) {
    console.error('Error removing calculation age:', error);
    throw error;
  }
}

// 年齢+月ベース計算設定を更新
export async function updateCalculationAge(
  userId: string,
  ageId: string,
  targetAge: number,
  targetMonth: number,
  targetAmount?: number | null
): Promise<void> {
  try {
    // 年齢の妥当性チェック
    if (targetAge < MIN_AGE || targetAge > MAX_AGE) {
      throw new Error(
        `年齢は${MIN_AGE}歳から${MAX_AGE}歳の間で設定してください。`
      );
    }

    if (targetMonth < 0 || targetMonth > 11) {
      throw new Error('月は0から11の間で設定してください。');
    }

    // 現在年齢+月を取得してチェック
    const currentAgeMonth = await getUserCurrentAgeMonth(userId);
    if (currentAgeMonth) {
      const currentTotalMonths =
        currentAgeMonth.age * 12 + currentAgeMonth.month;
      const targetTotalMonths = targetAge * 12 + targetMonth;

      if (targetTotalMonths <= currentTotalMonths) {
        throw new Error('目標年齢は現在の年齢より大きく設定してください。');
      }
    }

    // まず target_month を含めて更新を試みる
    let updateData: {
      target_age: number;
      target_month?: number;
      target_amount?: number | null;
      updated_at: string;
    } = {
      target_age: targetAge,
      target_month: targetMonth,
      updated_at: new Date().toISOString(),
    };

    // 目標額が指定されている場合は追加
    if (targetAmount !== undefined) {
      updateData.target_amount = targetAmount;
    }

    let { error } = await supabase
      .from('user_calculation_ages')
      .update(updateData)
      .eq('id', ageId)
      .eq('user_id', userId);

    // target_month カラムが存在しない場合、target_age のみで再試行
    if (
      error &&
      error.code === 'PGRST204' &&
      error.message?.includes('target_month')
    ) {
      console.warn('target_month column not found, updating target_age only');
      updateData = {
        target_age: targetAge,
        updated_at: new Date().toISOString(),
      };
      const { error: retryError } = await supabase
        .from('user_calculation_ages')
        .update(updateData)
        .eq('id', ageId)
        .eq('user_id', userId);

      if (retryError) {
        console.error('Error updating calculation age (retry):', retryError);
        throw retryError;
      }
    } else if (error) {
      console.error('Error updating calculation age:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating calculation age:', error);
    throw error;
  }
}

// 年齢ベース計算設定の順序を更新
export async function reorderCalculationAges(
  userId: string,
  ages: CalculationAgeDisplay[]
): Promise<void> {
  try {
    const updates = ages.map((age, index) => ({
      id: age.id,
      display_order: index + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('user_calculation_ages')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error reordering calculation ages:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error reordering calculation ages:', error);
    throw error;
  }
}

// 年齢ベース計算設定を追加できるかチェック（最低1つ制限考慮）
export async function canAddCalculationAge(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'can_add_calculation_age_with_minimum',
      {
        user_uuid: userId,
      }
    );

    if (error) {
      console.error('Error checking calculation age limit:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error checking calculation age limit:', error);
    return false;
  }
}

// ユーザーの年齢ベース計算設定数を取得（最低1つ制限考慮）
export async function getUserCalculationAgesCount(
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc(
      'get_user_calculation_ages_count_with_minimum',
      {
        user_uuid: userId,
      }
    );

    if (error) {
      console.error('Error getting calculation ages count:', error);
      return 1; // 最低1つ保証
    }

    return data || 1;
  } catch (error) {
    console.error('Error getting calculation ages count:', error);
    return 1;
  }
}

// 年齢+月ベースでの計算結果を取得
export async function calculateAgeBasedResults(
  userId: string,
  assets: Array<{ type: AssetType; amount: number; annualRate?: number }>,
  rates: DefaultInterestRates
): Promise<AgeCalculationResult> {
  try {
    // 現在年齢+月を取得
    const currentAgeMonth = await getUserCurrentAgeMonth(userId);
    if (!currentAgeMonth) {
      throw new Error(
        '生年月日が設定されていません。プロフィールで生年月日を設定してください。'
      );
    }

    // 年齢+月ベース計算設定を取得
    const agesToCalculate = await getUserCalculationAges(userId);
    const currentAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);

    const results = agesToCalculate.map((age) => {
      const currentAge = Number(currentAgeMonth.age);
      const currentMonth = Number(currentAgeMonth.month);
      const targetAge = Number(age.target_age);
      const targetMonth = Number(age.target_month ?? 0);

      if (
        !Number.isFinite(currentAge) ||
        !Number.isFinite(currentMonth) ||
        !Number.isFinite(targetAge) ||
        !Number.isFinite(targetMonth)
      ) {
        throw new Error('年齢計算に不正な数値が含まれています。');
      }

      const currentTotalMonths = currentAge * 12 + currentMonth;
      const targetTotalMonths = targetAge * 12 + targetMonth;
      const totalMonthsToTarget = targetTotalMonths - currentTotalMonths;

      if (totalMonthsToTarget <= 0) {
        throw new Error(
          `目標年齢（${targetAge}歳${targetMonth}ヶ月）は現在の年齢（${currentAge}歳${currentMonth}ヶ月）以下です。`
        );
      }

      const yearsToTarget = Math.floor(totalMonthsToTarget / 12);
      const monthsToTarget = totalMonthsToTarget % 12;
      const yearsForCalculation = totalMonthsToTarget / 12; // 月を含む正確な年数

      let futureValue = 0;
      for (const asset of assets) {
        // 各資産の個別のannualRateを使用、なければデフォルト利率を使用
        const assetRate = asset.annualRate ?? rates[asset.type] ?? 0;
        const assetFutureValue = Math.round(
          asset.amount * Math.pow(1 + assetRate / 100, yearsForCalculation)
        );
        futureValue += assetFutureValue;
      }

      const increaseAmount = Math.round(futureValue - currentAssets);
      // 平均利率も各資産のannualRateを使用して計算
      const averageRate =
        assets.length > 0
          ? assets.reduce(
              (sum, asset) =>
                sum + (asset.annualRate ?? rates[asset.type] ?? 0),
              0
            ) / assets.length
          : 0;

      return {
        targetAge,
        targetMonth,
        yearsToTarget,
        monthsToTarget,
        totalMonthsToTarget,
        futureValue,
        increaseAmount,
        averageRate,
      };
    });

    return {
      userId,
      currentAge: currentAgeMonth.age,
      currentMonth: currentAgeMonth.month,
      currentAssets,
      results,
    };
  } catch (error) {
    console.error('Error calculating age-based results:', error);
    throw error;
  }
}
