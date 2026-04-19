// 年数設定管理用の型定義

// 年数設定
export interface CalculationYear {
  id: string;
  user_id: string;
  year_number: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 年数設定（表示用）
export interface CalculationYearDisplay {
  id: string;
  year_number: number;
  is_active: boolean;
  display_order: number;
}

// 年数設定管理用のフック
export interface UseCalculationYearsReturn {
  years: CalculationYearDisplay[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean;
  maxCount: number;
  currentCount: number;
  addYear: (yearNumber: number) => Promise<void>;
  removeYear: (id: string) => Promise<void>;
  updateYear: (id: string, yearNumber: number) => Promise<void>;
  reorderYears: (years: CalculationYearDisplay[]) => Promise<void>;
}

// 計算結果（複数年数対応）
export interface MultiYearCalculationResult {
  currentAssets: number;
  results: {
    year: number;
    futureValue: number;
    increaseAmount: number;
    averageRate: number;
  }[];
}

// 年数設定の制限
export interface YearLimits {
  free: number;
  pro: number;
}

// デフォルト年数設定（新規ユーザー用）
export const DEFAULT_CALCULATION_YEARS: CalculationYearDisplay[] = [
  {
    id: 'default',
    year_number: 10,
    is_active: true,
    display_order: 1,
  },
];

// 年数制限
export const YEAR_LIMITS: YearLimits = {
  free: 1,
  pro: 3,
};
