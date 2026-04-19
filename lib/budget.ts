import { supabase } from './supabase';
import {
  CreateBudgetCategoryInput,
  CreateBudgetPeriodInput,
  UpdateBudgetCategoryInput,
  UpdateBudgetPeriodInput,
  UserBudgetCategory,
  UserBudgetPeriod,
} from '../types/budget';

export async function fetchBudgetCategories(): Promise<UserBudgetCategory[]> {
  const { data, error } = await supabase
    .from('user_budget_categories')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as UserBudgetCategory[];
}

export async function createBudgetCategory(input: CreateBudgetCategoryInput) {
  const payload = {
    type: input.type,
    name: input.name,
    amount: input.amount ?? 0,
    is_pro_only: input.isProOnly ?? false,
  };
  const { data, error } = await supabase
    .from('user_budget_categories')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  return data as UserBudgetCategory;
}

export async function updateBudgetCategory(
  id: string,
  input: UpdateBudgetCategoryInput
) {
  const { data, error } = await supabase
    .from('user_budget_categories')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserBudgetCategory;
}

export async function deleteBudgetCategory(id: string) {
  const { error } = await supabase
    .from('user_budget_categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchBudgetPeriods(): Promise<UserBudgetPeriod[]> {
  const { data, error } = await supabase
    .from('user_budget_periods')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as UserBudgetPeriod[];
}

export async function createBudgetPeriod(input: CreateBudgetPeriodInput) {
  // 現在のユーザーIDを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証されていません');
  }

  const payload = {
    user_id: user.id,
    type: input.type,
    name: input.name,
    start_date: input.startDate,
    end_date: input.endDate,
    monthly_amount: input.monthlyAmount,
    // annual_rate is not saved (NULL) - rate is determined by asset type
    is_pro_only: input.isProOnly ?? false,
    ...(input.sourceAssetId ? { source_asset_id: input.sourceAssetId } : {}),
    ...(input.targetAssetId ? { target_asset_id: input.targetAssetId } : {}),
  };
  const { data, error } = await supabase
    .from('user_budget_periods')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  return data as UserBudgetPeriod;
}

export async function updateBudgetPeriod(
  id: string,
  input: UpdateBudgetPeriodInput
) {
  const { data, error } = await supabase
    .from('user_budget_periods')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.startDate !== undefined ? { start_date: input.startDate } : {}),
      ...(input.endDate !== undefined ? { end_date: input.endDate } : {}),
      ...(input.monthlyAmount !== undefined
        ? { monthly_amount: input.monthlyAmount }
        : {}),
      ...(input.sourceAssetId !== undefined
        ? { source_asset_id: input.sourceAssetId }
        : {}),
      ...(input.targetAssetId !== undefined
        ? { target_asset_id: input.targetAssetId }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserBudgetPeriod;
}

export async function deleteBudgetPeriod(id: string) {
  const { error } = await supabase
    .from('user_budget_periods')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
