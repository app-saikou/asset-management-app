// ユーザープロフィール関連の型定義
export interface UserProfile {
  id: string;
  user_id: string;
  birth_date: string; // ISO date string (YYYY-MM-DD)
  name?: string | null; // ユーザー名
  onboarding_completed?: boolean; // オンボーディング完了フラグ
  notification_enabled?: boolean; // 通知有効/無効
  notification_day?: number; // -1: 月末, 1-31: 指定日
  notification_hour?: number; // 通知時間（0-23時、デフォルト9時）
  created_at: string;
  updated_at: string;
}

// 年齢+月ベース計算設定の型定義
export interface CalculationAge {
  id: string;
  user_id: string;
  target_age: number;
  target_month: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 年齢+月ベース計算設定の表示用型
export interface CalculationAgeDisplay {
  id: string;
  target_age: number;
  target_month: number;
  target_amount?: number | null;
  is_active: boolean;
  display_order: number;
}

// 年齢計算結果の型定義
export interface AgeCalculationResult {
  userId: string;
  currentAge: number;
  currentMonth: number;
  currentAssets: number;
  results: {
    targetAge: number;
    targetMonth: number;
    yearsToTarget: number;
    monthsToTarget: number;
    totalMonthsToTarget: number;
    futureValue: number;
    increaseAmount: number;
    averageRate: number;
  }[];
}

// 年齢制限の型定義
export interface AgeLimits {
  free: number;
  pro: number;
}

// デフォルトの年齢+月設定
export const DEFAULT_CALCULATION_AGES: CalculationAgeDisplay[] = [
  {
    id: 'default',
    target_age: 65,
    target_month: 0,
    is_active: true,
    display_order: 1,
  },
];

// 年齢制限
export const AGE_LIMITS: AgeLimits = {
  free: 1,
  pro: 1,
};

// 年齢範囲の制限
export const MIN_AGE = 18;
export const MAX_AGE = 120;

// ユーザープロフィール作成用の型
export interface CreateUserProfileData {
  birth_date?: string;
  name?: string;
  onboarding_completed?: boolean;
  notification_enabled?: boolean;
  notification_day?: number;
  notification_hour?: number;
}

// 年齢+月計算設定作成用の型
export interface CreateCalculationAgeData {
  target_age: number;
  target_month: number;
}

// 年齢+月計算設定更新用の型
export interface UpdateCalculationAgeData {
  target_age: number;
  target_month: number;
}

// 年齢計算設定の並び替え用の型
export interface ReorderCalculationAgesData {
  id: string;
  display_order: number;
}
