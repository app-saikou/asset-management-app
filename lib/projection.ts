const MAX_NUMERIC_VALUE = 100_000_000_000_000; // numeric(18,2) 安全上限（十分な余裕）
const MAX_RATE_VALUE = 9999.9999; // numeric(7,4) 想定上限

const clampNumeric = (value: number, decimals: number, max: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  const clamped = Math.min(Math.max(rounded, -max), max);
  return Number.isFinite(clamped) ? clamped : 0;
};
import { supabase } from './supabase';
import {
  UserBudgetPeriod,
  MonthlyAssetProjection,
  TargetAgeSnapshot,
} from '../types/budget';

/**
 * 月次複利計算エンジン
 * B_j(m) = (B_j(m-1) + contrib_j(m)) × (1 + rate_j(m)/12)
 */
export class MonthlyProjectionEngine {
  private userId: string;
  private assets: Array<{
    id: string;
    name: string;
    type: 'cash' | 'stock';
    amount: number;
    annualRate: number;
  }>;
  private budgetPeriods: UserBudgetPeriod[];
  private calculationDate: Date;
  private birthDate?: Date;

  constructor(
    userId: string,
    assets: Array<{
      id: string;
      name: string;
      type: 'cash' | 'stock';
      amount: number;
      annualRate: number;
    }>,
    budgetPeriods: UserBudgetPeriod[],
    calculationDate: Date,
    birthDate?: string
  ) {
    this.userId = userId;
    // 有効な資産のみを保持（idが存在するもの）
    this.assets = assets.filter(
      (asset) => asset.id && asset.id !== '' && asset.id.trim() !== ''
    );
    this.budgetPeriods = budgetPeriods;
    // 計算実行日を正規化（時間部分を0時に統一）
    this.calculationDate = new Date(calculationDate);
    this.calculationDate.setHours(0, 0, 0, 0);
    this.birthDate = birthDate ? new Date(birthDate) : undefined;

    if (this.assets.length === 0) {
      console.warn('MonthlyProjectionEngine: 有効な資産がありません');
    }
  }

  /**
   * 指定された月の予測を計算
   * @param monthYear YYYY-MM-01形式の日付文字列
   * @returns 各資産の予測残高
   */
  calculateMonthProjection(
    monthYear: string,
    balances: Map<string, number>,
    assets: Array<{
      id: string;
      name: string;
      type: 'cash' | 'stock';
      amount: number;
      annualRate: number;
    }>
  ): Array<{
    assetId: string;
    assetType: 'cash' | 'stock';
    balance: number;
    contribution: number;
    rate: number;
  }> {
    if (assets.length === 0) {
      console.warn('有効な資産がありません');
      return [];
    }

    // 現金・株式の残高を計算し、現金がマイナスになる場合は投資を抑制する
    // Step1: 全資産の貢献額を仮計算
    const contributions = new Map<string, number>();
    assets.forEach((asset) => {
      contributions.set(asset.id, this.calculateContribution(asset.id, monthYear));
    });

    // Step2: 現金資産の残高を確認し、投資で現金がマイナスになる場合は投資額を調整
    const cashAssets = assets.filter((a) => a.type === 'cash');
    cashAssets.forEach((cashAsset) => {
      const prevCash = balances.get(cashAsset.id) ?? cashAsset.amount;
      const cashContrib = contributions.get(cashAsset.id) ?? 0;
      const projectedCash = prevCash + cashContrib;

      if (projectedCash < 0) {
        // 現金がマイナスになる場合、投資期間の貢献額を調整
        this.budgetPeriods.forEach((period) => {
          if (
            period.type === 'investment' &&
            period.source_asset_id === cashAsset.id
          ) {
            // 現金から出せる実際の投資額（0以上に制限）
            const netBeforeInvestment = prevCash + cashContrib + period.monthly_amount;
            const actualInvestment = Math.max(0, Math.min(period.monthly_amount, netBeforeInvestment));
            const reduction = period.monthly_amount - actualInvestment;

            if (reduction > 0) {
              // 現金側: 投資減少分だけ貢献額を増やす（引かれすぎを戻す）
              contributions.set(cashAsset.id, cashContrib + reduction);
              // 株式側: 投資減少分だけ貢献額を減らす
              const stockAssetId = period.target_asset_id;
              if (stockAssetId) {
                const stockContrib = contributions.get(stockAssetId) ?? 0;
                contributions.set(stockAssetId, stockContrib - reduction);
              }
            }
          }
        });
      }
    });

    // Step3: 最終残高を計算
    return assets.map((asset) => {
      const previousBalance = balances.get(asset.id) ?? asset.amount;
      const contribution = contributions.get(asset.id) ?? 0;
      const rate = this.getRate(asset.id, monthYear);
      const balance = (previousBalance + contribution) * (1 + rate / 12);

      balances.set(asset.id, balance);

      return {
        assetId: asset.id,
        assetType: asset.type,
        balance,
        contribution,
        rate,
      };
    });
  }

  /**
   * 複数月の予測を計算
   * @param startMonth 開始月 (YYYY-MM-01)
   * @param endMonth 終了月 (YYYY-MM-01)
   * @returns 月次予測データ
   */
  calculateMultiMonthProjection(
    startMonth: string,
    endMonth: string
  ): MonthlyAssetProjection[] {
    const projections: MonthlyAssetProjection[] = [];
    const current = new Date(startMonth);
    const end = new Date(endMonth);
    const validAssets = this.assets.filter(
      (asset) => asset.id && asset.id !== ''
    );

    if (validAssets.length === 0) {
      console.warn('有効な資産がありません');
      return projections;
    }

    const balances = new Map<string, number>();
    validAssets.forEach((asset) => {
      balances.set(asset.id, asset.amount);
    });

    let isFirstMonth = true;

    while (current <= end) {
      const monthYear = current.toISOString().slice(0, 7) + '-01';

      // 最初の月（開始月）は複利計算を適用しない
      if (isFirstMonth) {
        validAssets.forEach((asset) => {
          // assetIdが空文字列または未定義の場合はスキップ
          if (!asset.id || asset.id === '' || asset.id.trim() === '') {
            return;
          }

          const contribution = this.calculateContribution(asset.id, monthYear);
          const rate = this.getRate(asset.id, monthYear);
          // 最初の月は複利計算なし（初期資産額 + 貢献額のみ）
          const balance = balances.get(asset.id) || asset.amount;
          const finalBalance = balance + contribution;

          // 次の月の計算のために残高を更新
          balances.set(asset.id, finalBalance);

          projections.push({
            user_id: this.userId,
            asset_id: asset.id,
            asset_type: asset.type,
            month_year: monthYear,
            balance: finalBalance,
            contribution: contribution,
            rate: rate,
          });
        });
        isFirstMonth = false;
      } else {
        // 2月目以降は通常の複利計算
        const monthProjections = this.calculateMonthProjection(
          monthYear,
          balances,
          validAssets
        );

        monthProjections.forEach((projection) => {
          // assetIdが空文字列または未定義の場合はスキップ
          if (!projection.assetId || projection.assetId === '') {
            console.warn('無効なassetIdの予測データをスキップ:', projection);
            return;
          }

          projections.push({
            user_id: this.userId,
            asset_id: projection.assetId,
            asset_type: projection.assetType,
            month_year: monthYear,
            balance: projection.balance,
            contribution: projection.contribution,
            rate: projection.rate,
          });
        });
      }

      // 次の月に進む
      current.setMonth(current.getMonth() + 1);
    }

    return projections;
  }

  /**
   * 目標年齢でのスナップショットを計算
   * @param targetAge 目標年齢
   * @returns スナップショットデータ
   */
  calculateTargetAgeSnapshot(targetAge: number): TargetAgeSnapshot {
    const currentYear = this.calculationDate.getFullYear();
    const currentMonth = this.calculationDate.getMonth() + 1;

    // 目標年齢までの月数を計算
    const yearsFromNow = targetAge - this.getCurrentAge();
    const monthsFromNow = yearsFromNow * 12;

    // 目標月を計算
    const targetDate = new Date(
      currentYear,
      currentMonth - 1 + monthsFromNow,
      1
    );
    const targetMonth = targetDate.toISOString().slice(0, 7) + '-01';

    const validAssets = this.assets.filter(
      (asset) => asset.id && asset.id !== ''
    );

    if (validAssets.length === 0) {
      return {
        user_id: this.userId,
        target_age: targetAge,
        years_from_now: yearsFromNow,
        months_from_now: monthsFromNow,
        total_balance: 0,
      };
    }

    const balances = new Map<string, number>();
    validAssets.forEach((asset) => balances.set(asset.id, asset.amount));

    const simulationCurrent = new Date(currentYear, currentMonth - 1, 1);
    let latestProjections: Array<{
      assetId: string;
      balance: number;
      contribution: number;
      rate: number;
    }> = [];

    while (simulationCurrent <= targetDate) {
      const monthYear = simulationCurrent.toISOString().slice(0, 7) + '-01';
      latestProjections = this.calculateMonthProjection(
        monthYear,
        balances,
        validAssets
      );
      simulationCurrent.setMonth(simulationCurrent.getMonth() + 1);
    }

    const totalBalance = latestProjections.reduce(
      (sum, projection) => sum + projection.balance,
      0
    );

    return {
      user_id: this.userId,
      target_age: targetAge,
      years_from_now: yearsFromNow,
      months_from_now: monthsFromNow,
      total_balance: totalBalance,
    };
  }

  /**
   * 当月の貢献額を計算
   * 実行日より未来の給料日のみを加算（過去の給料は既に現在資産に反映済み）
   */
  private calculateContribution(assetId: string, monthYear: string): number {
    const monthDate = new Date(monthYear);
    const month = monthDate.getMonth(); // 0-indexed
    const year = monthDate.getFullYear();

    let totalContribution = 0;

    this.budgetPeriods.forEach((period) => {
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);

      // その月の給料日を計算（開始日の「日」部分を使用）
      const salaryDay = startDate.getDate();

      // その月の最終日を取得（月末日を超えないようにする）
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(salaryDay, lastDayOfMonth);

      // その月の給料日
      const monthSalaryDate = new Date(year, month, actualDay);
      monthSalaryDate.setHours(0, 0, 0, 0);

      // 1. その月の給料日が期間内かチェック
      const isInPeriod =
        startDate <= monthSalaryDate && monthSalaryDate <= endDate;

      // 2. その月の給料日が実行日より未来かチェック
      // （過去の給料は既に現在資産に反映済みなので、予測計算には含めない）
      const isFuture = monthSalaryDate > this.calculationDate;

      // 期間内 かつ 未来 なら加算
      if (isInPeriod && isFuture) {
        if (period.type === 'income' && period.target_asset_id === assetId) {
          totalContribution += period.monthly_amount;
        } else if (
          period.type === 'expense' &&
          period.source_asset_id === assetId
        ) {
          totalContribution -= period.monthly_amount;
        } else if (
          period.type === 'investment' &&
          period.source_asset_id === assetId
        ) {
          totalContribution -= period.monthly_amount;
        } else if (
          period.type === 'investment' &&
          period.target_asset_id === assetId
        ) {
          totalContribution += period.monthly_amount;
        }
      }
    });

    return totalContribution;
  }

  /**
   * 当月の利率を取得
   */
  private getRate(assetId: string, monthYear: string): number {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) return 0;

    const rate = Number(asset.annualRate ?? 0);
    if (!Number.isFinite(rate)) {
      return 0;
    }
    return rate / 100;
  }

  /**
   * 現在の年齢を取得
   */
  private getCurrentAge(): number {
    if (!this.birthDate) {
      console.warn('MonthlyProjectionEngine: birthDateが未設定のためデフォルト30歳を使用');
      return 30;
    }
    const today = this.calculationDate;
    let age = today.getFullYear() - this.birthDate.getFullYear();
    const hasHadBirthday =
      today.getMonth() > this.birthDate.getMonth() ||
      (today.getMonth() === this.birthDate.getMonth() &&
        today.getDate() >= this.birthDate.getDate());
    if (!hasHadBirthday) age -= 1;
    return age;
  }
}

/**
 * 月次予測をデータベースに保存
 */
export async function saveMonthlyProjections(
  projections: MonthlyAssetProjection[],
  projectionRunId: string
): Promise<void> {
  console.log('【saveMonthlyProjections】受け取った予測データ:', {
    総数: projections.length,
    サンプル: projections.slice(0, 3).map((p) => ({
      user_id: p.user_id,
      asset_id: p.asset_id,
      month_year: p.month_year,
    })),
    projectionRunId,
  });

  if (!projectionRunId || !projectionRunId.trim()) {
    throw new Error('projection_run_id が指定されていません');
  }

  // バリデーション: 空のUUIDをチェック
  const invalidProjections = projections.filter(
    (p) => !p.user_id || p.user_id === '' || !p.asset_id || p.asset_id === ''
  );

  if (invalidProjections.length > 0) {
    console.error('【saveMonthlyProjections】無効な予測データ:', {
      無効なデータ数: invalidProjections.length,
      サンプル: invalidProjections.slice(0, 3).map((p) => ({
        user_id: p.user_id,
        asset_id: p.asset_id,
        month_year: p.month_year,
      })),
    });
    throw new Error('予測データに無効なUUIDが含まれています');
  }

  // UUID形式のバリデーション関数
  const isValidUUID = (uuid: string): boolean => {
    if (!uuid || typeof uuid !== 'string' || uuid.trim() === '') {
      return false;
    }
    // UUID v4形式のチェック（簡易版）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
  };

  // 有効なデータのみをフィルタリングして保存（UUID形式のチェックも含む）
  const validProjections = projections.filter((p) => {
    const isValidUser = p.user_id && isValidUUID(p.user_id);
    const isValidAsset = p.asset_id && isValidUUID(p.asset_id);

    if (!isValidUser || !isValidAsset) {
      console.warn('【saveMonthlyProjections】無効なUUIDを検出:', {
        user_id: p.user_id,
        asset_id: p.asset_id,
        month_year: p.month_year,
        user_id_valid: isValidUser,
        asset_id_valid: isValidAsset,
      });
      return false;
    }
    return true;
  });

  console.log('【saveMonthlyProjections】有効な予測データ:', {
    有効数: validProjections.length,
    除外数: projections.length - validProjections.length,
    サンプル: validProjections.slice(0, 3).map((p) => ({
      user_id: p.user_id,
      asset_id: p.asset_id,
      month_year: p.month_year,
    })),
  });

  if (validProjections.length === 0) {
    console.warn('【saveMonthlyProjections】保存する有効なデータがありません');
    return;
  }

  // 最終チェック: 挿入前に再度UUID形式を確認
  const finalValidProjections = validProjections.filter((p) => {
    return isValidUUID(p.user_id) && isValidUUID(p.asset_id);
  });

  if (finalValidProjections.length !== validProjections.length) {
    console.error(
      '【saveMonthlyProjections】最終チェックで無効なデータを検出:',
      {
        元の数: validProjections.length,
        最終数: finalValidProjections.length,
      }
    );
  }

  const insertPayload = finalValidProjections.map(
    ({ id, created_at, balance, contribution, rate, ...rest }) => ({
      ...rest,
      projection_run_id: projectionRunId,
      balance: clampNumeric(balance, 2, MAX_NUMERIC_VALUE),
      contribution: clampNumeric(contribution, 2, MAX_NUMERIC_VALUE),
      rate: clampNumeric(rate, 4, MAX_RATE_VALUE),
    })
  );

  const { error } = await supabase
    .from('monthly_asset_projections')
    .upsert(insertPayload, {
      onConflict: 'projection_run_id,asset_id,month_year',
    });

  if (error) {
    console.error('【saveMonthlyProjections】データベースエラー:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`月次予測の保存に失敗しました: ${error.message}`);
  }

  console.log(
    '【saveMonthlyProjections】保存成功:',
    validProjections.length,
    '件'
  );
}

/**
 * 目標年齢スナップショットをデータベースに保存
 * 既存のレコードがある場合は更新、ない場合は挿入
 */
export async function saveTargetAgeSnapshot(
  snapshot: TargetAgeSnapshot
): Promise<void> {
  const { id, created_at, ...payload } = snapshot;
  const sanitizedPayload = {
    ...payload,
    total_balance: clampNumeric(payload.total_balance, 2, MAX_NUMERIC_VALUE),
  };

  // unique(user_id, target_age) 制約があるため、upsertを使用
  const { error } = await supabase
    .from('target_age_snapshots')
    .upsert([sanitizedPayload], {
      onConflict: 'user_id,target_age',
    });

  if (error) {
    throw new Error(`スナップショットの保存に失敗しました: ${error.message}`);
  }
}

/**
 * ユーザーの月次予測を取得
 */
export async function fetchMonthlyProjections(
  userId: string,
  startMonth?: string,
  endMonth?: string
): Promise<MonthlyAssetProjection[]> {
  let query = supabase
    .from('monthly_asset_projections')
    .select('*')
    .eq('user_id', userId)
    .order('month_year', { ascending: true });

  if (startMonth) {
    query = query.gte('month_year', startMonth);
  }
  if (endMonth) {
    query = query.lte('month_year', endMonth);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`月次予測の取得に失敗しました: ${error.message}`);
  }

  return (data || []) as MonthlyAssetProjection[];
}

/**
 * ユーザーの目標年齢スナップショットを取得
 */
export async function fetchTargetAgeSnapshots(
  userId: string
): Promise<TargetAgeSnapshot[]> {
  const { data, error } = await supabase
    .from('target_age_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('target_age', { ascending: true });

  if (error) {
    throw new Error(`スナップショットの取得に失敗しました: ${error.message}`);
  }

  return (data || []) as TargetAgeSnapshot[];
}
