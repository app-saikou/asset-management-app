// Budget-related shared types

export type BudgetType = 'income' | 'expense' | 'investment';

export interface UserBudgetCategory {
  id: string;
  user_id: string;
  type: Exclude<BudgetType, 'investment'>; // categories limited to income/expense
  name: string;
  amount: number; // default monthly amount for this category (optional usage)
  is_pro_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetCategoryInput {
  type: Exclude<BudgetType, 'investment'>;
  name: string;
  amount?: number;
  isProOnly?: boolean;
}

export interface UpdateBudgetCategoryInput {
  name?: string;
  amount?: number;
}

export interface UserBudgetPeriod {
  id: string;
  user_id: string;
  type: BudgetType; // income | expense | investment
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  monthly_amount: number; // positive for income/investment, negative allowed for expense by convention? We keep positive and sign by type in logic later
  annual_rate: number | null; // NULL (not used in calculations - rate is determined by asset type)
  source_asset_id?: string | null; // expense/investment
  target_asset_id?: string | null; // income/investment
  is_pro_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetPeriodInput {
  type: BudgetType;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  monthlyAmount: number;
  annualRate?: number; // Not used - always set to 0 (rate is determined by asset type)
  isProOnly?: boolean;
  sourceAssetId?: string; // for expense/investment
  targetAssetId?: string; // for income/investment
}

export interface UpdateBudgetPeriodInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  monthlyAmount?: number;
  annualRate?: number; // Not used - always set to 0 (rate is determined by asset type)
  sourceAssetId?: string | null;
  targetAssetId?: string | null;
}

export interface MonthlyAssetProjection {
  id?: string;
  user_id: string;
  asset_id: string;
  asset_type?: 'cash' | 'stock';
  month_year: string; // YYYY-MM-01
  balance: number;
  contribution: number;
  rate: number; // annual rate applied that month
  created_at?: string;
  projection_run_id?: string;
}

export interface TargetAgeSnapshot {
  id?: string;
  user_id: string;
  target_age: number;
  years_from_now: number;
  months_from_now: number;
  total_balance: number;
  created_at?: string;
}
