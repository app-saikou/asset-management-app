import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUserProfile } from './useAgeBasedCalculation';
import { useMultipleAssets } from './useMultipleAssets';
import { useCalculationAges } from './useAgeBasedCalculation';
import { useBudget } from './useBudget';
import { useProjection } from './useProjection';
import { useAssetHistory } from './useAssetHistory';
import { supabase } from '../lib/supabase';
import { checkTargetAgeValidity } from '../lib/targetAgeCheck';
import {
  OnboardingData,
  OnboardingState,
  OnboardingResult,
} from '../types/onboarding';

export function useOnboarding() {
  const { user } = useAuth();
  const {
    profile,
    createProfile,
    updateProfile,
    isLoading: profileLoading,
  } = useUserProfile();
  const { addAsset } = useMultipleAssets();
  const { addAge, calculateResults } = useCalculationAges();
  const { addPeriod, editPeriod } = useBudget();
  const { calculateAndSaveProjections } = useProjection();
  const { saveHistory } = useAssetHistory();

  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    totalSteps: 8,
    data: {},
    isLoading: false,
    error: null,
  });

  // 新規ユーザー判定
  const isNewUser = useCallback(() => {
    if (!user?.id) return false;

    if (profileLoading) {
      return false;
    }

    // プロフィールが存在しない、またはオンボーディング未完了の場合
    return !profile || profile.onboarding_completed === false;
  }, [user?.id, profile, profileLoading]);

  // オンボーディングデータの保存
  const saveStepData = useCallback((stepData: Partial<OnboardingData>) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...stepData },
    }));
  }, []);

  // 次のステップに進む
  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps),
      error: null,
    }));
  }, []);

  // 前のステップに戻る
  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
      error: null,
    }));
  }, []);

  // オンボーディング完了処理
  const completeOnboarding =
    useCallback(async (): Promise<OnboardingResult> => {
      if (!user?.id || !state.data) {
        return {
          success: false,
          message: 'ユーザー情報またはデータが不足しています',
        };
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const {
          name,
          birthDate,
          cashAsset,
          stockAsset,
          targetAge,
          targetAmount,
          income,
          expense,
          investment,
        } = state.data;

        console.log('【completeOnboarding】開始:', {
          hasCashAsset: !!cashAsset,
          hasStockAsset: !!stockAsset,
          cashAssetName: cashAsset?.name,
          stockAssetName: stockAsset?.name,
        });

        // 1. ユーザープロフィールの更新は最後に実行（他の処理が成功した後に完了フラグを設定）
        // 先にプロフィールの基本情報のみ更新（完了フラグは最後に設定）
        if (profile) {
          await updateProfile({
            birth_date: birthDate!,
            name: name!,
            // onboarding_completedは最後に設定
          });
        } else {
          // プロフィールが存在しない場合は作成
          await createProfile({
            birth_date: birthDate!,
            name: name!,
            // onboarding_completedは最後に設定
          });
        }

        // 2. 資産データの登録（ステップ2で既に保存されている場合はスキップ）
        // 既存の資産を確認
        const { data: existingAssets } = await supabase
          .from('multiple_assets')
          .select('id, type, name')
          .eq('user_id', user.id);

        const existingCashAsset = existingAssets?.find(
          (asset) => asset.type === 'cash'
        );
        const existingStockAsset = existingAssets?.find(
          (asset) => asset.type === 'stock'
        );

        // 現金資産が存在しない場合のみ追加
        if (!existingCashAsset) {
          if (!cashAsset || cashAsset.amount === undefined) {
            throw new Error('現金資産のデータが不足しています');
          }
          // nameがundefined、null、空文字列の場合はデフォルト名を使用
          const cashName =
            cashAsset.name &&
            typeof cashAsset.name === 'string' &&
            cashAsset.name.trim()
              ? cashAsset.name.trim()
              : '現金';
          await addAsset('cash', cashName, cashAsset.amount, 0.1);
        }

        // 株式資産が存在しない場合のみ追加
        if (!existingStockAsset) {
          if (!stockAsset || stockAsset.amount === undefined) {
            throw new Error('株式資産のデータが不足しています');
          }
          // nameがundefined、null、空文字列の場合はデフォルト名を使用
          const stockName =
            stockAsset.name &&
            typeof stockAsset.name === 'string' &&
            stockAsset.name.trim()
              ? stockAsset.name.trim()
              : '株式';
          await addAsset('stock', stockName, stockAsset.amount, 5.0);
        }

        // 3. 目標年齢と目標資産額の設定（既存の65歳を更新）
        // 既存の年齢設定を取得して更新
        const existingAges = await supabase
          .from('user_calculation_ages')
          .select('id')
          .eq('user_id', user.id)
          .eq('target_age', 65)
          .single();

        if (existingAges.data) {
          const updateData: {
            target_age: number;
            target_amount?: number;
          } = {
            target_age: targetAge!,
          };

          // 目標資産額が設定されている場合は追加
          if (targetAmount !== undefined && targetAmount !== null) {
            updateData.target_amount = targetAmount;
          }

          await supabase
            .from('user_calculation_ages')
            .update(updateData)
            .eq('id', existingAges.data.id);
        } else {
          // 既存の設定がない場合は新規作成
          const insertData: {
            user_id: string;
            target_age: number;
            target_month: number;
            target_amount?: number;
            is_active: boolean;
            display_order: number;
          } = {
            user_id: user.id,
            target_age: targetAge!,
            target_month: 0,
            is_active: true,
            display_order: 1,
          };

          // 目標資産額が設定されている場合は追加
          if (targetAmount !== undefined && targetAmount !== null) {
            insertData.target_amount = targetAmount;
          }

          await supabase.from('user_calculation_ages').insert(insertData);
        }

        // 4. 収支期間の登録（既存チェックを追加）
        // 既存の期間を確認（データ整合性チェックの前に取得）
        const { data: existingPeriods } = await supabase
          .from('user_budget_periods')
          .select('id, type')
          .eq('user_id', user.id);

        const existingIncomePeriod = existingPeriods?.find(
          (period) => period.type === 'income'
        );
        const existingExpensePeriod = existingPeriods?.find(
          (period) => period.type === 'expense'
        );
        const existingInvestmentPeriod = existingPeriods?.find(
          (period) => period.type === 'investment'
        );

        // 資産IDを取得（新規追加時に使用）
        const { data: currentAssets } = await supabase
          .from('multiple_assets')
          .select('id, type')
          .eq('user_id', user.id);

        const currentCashAsset = currentAssets?.find(
          (asset: { id: string; type: string }) => asset.type === 'cash'
        );
        const currentStockAsset = currentAssets?.find(
          (asset: { id: string; type: string }) => asset.type === 'stock'
        );

        // 収入期間を保存または更新
        if (existingIncomePeriod) {
          // 既存の場合は更新（資産IDは更新しない = 既存の値が保持される）
          await editPeriod(existingIncomePeriod.id, {
            monthlyAmount: income!.monthlyAmount,
            name: income!.name,
            startDate: income!.startDate,
            endDate: income!.endDate,
          });
        } else {
          // 新規の場合は追加（資産IDを自動設定）
          if (!currentCashAsset) {
            throw new Error('現金資産が見つかりません');
          }
          await addPeriod({
            type: 'income',
            name: income!.name,
            startDate: income!.startDate,
            endDate: income!.endDate,
            monthlyAmount: income!.monthlyAmount,
            targetAssetId: currentCashAsset.id,
          });
        }

        // 支出期間を保存または更新
        if (existingExpensePeriod) {
          // 既存の場合は更新（資産IDは更新しない = 既存の値が保持される）
          await editPeriod(existingExpensePeriod.id, {
            monthlyAmount: expense!.monthlyAmount,
            name: expense!.name,
            startDate: expense!.startDate,
            endDate: expense!.endDate,
          });
        } else {
          // 新規の場合は追加（資産IDを自動設定）
          if (!currentCashAsset) {
            throw new Error('現金資産が見つかりません');
          }
          await addPeriod({
            type: 'expense',
            name: expense!.name,
            startDate: expense!.startDate,
            endDate: expense!.endDate,
            monthlyAmount: expense!.monthlyAmount,
            sourceAssetId: currentCashAsset.id,
          });
        }

        // 投資期間を保存または更新（investmentがある場合）
        if (investment) {
          if (existingInvestmentPeriod) {
            // 既存の場合は更新（資産IDは更新しない = 既存の値が保持される）
            await editPeriod(existingInvestmentPeriod.id, {
              monthlyAmount: investment.monthlyAmount,
              name: investment.name,
              startDate: investment.startDate,
              endDate: investment.endDate,
            });
          } else {
            // 新規の場合は追加（資産IDを自動設定）
            if (!currentCashAsset || !currentStockAsset) {
              throw new Error('現金または株式資産が見つかりません');
            }
            await addPeriod({
              type: 'investment',
              name: investment.name,
              startDate: investment.startDate,
              endDate: investment.endDate,
              monthlyAmount: investment.monthlyAmount,
              sourceAssetId: currentCashAsset.id,
              targetAssetId: currentStockAsset.id,
            });
          }
        }

        // 5. 目標年齢の妥当性をチェック
        try {
          const ageCheckResult = await checkTargetAgeValidity(user.id);
          if (ageCheckResult.needsUpdate) {
            console.log('⚠️ 目標年齢の更新が必要です:', ageCheckResult);
            // オンボーディング中は自動的に推奨年齢に更新
            const recommendedAge = Math.min(ageCheckResult.currentAge + 5, 100);
            await addAge(recommendedAge, 0);
            console.log(`✅ 目標年齢を${recommendedAge}歳に自動更新しました`);
          }
        } catch (error) {
          console.error('目標年齢チェックエラー:', error);
          // エラーが発生してもオンボーディングは続行
        }

        // 6. 月次予測の計算・保存（データ整合性チェック後）
        console.log('オンボーディング完了: 月次予測計算を開始します');

        // データの整合性をチェック
        const { data: checkAssets } = await supabase
          .from('multiple_assets')
          .select('id, type')
          .eq('user_id', user.id);

        const { data: checkPeriods } = await supabase
          .from('user_budget_periods')
          .select('id, type')
          .eq('user_id', user.id);

        const { data: checkAges } = await supabase
          .from('user_calculation_ages')
          .select('id, target_age')
          .eq('user_id', user.id);

        console.log('データ整合性チェック:', {
          assets: checkAssets?.length || 0,
          periods: checkPeriods?.length || 0,
          ages: checkAges?.length || 0,
        });

        let projectionRunId: string | null = null;

        if (
          checkAssets &&
          checkAssets.length > 0 &&
          checkPeriods &&
          checkPeriods.length > 0 &&
          checkAges &&
          checkAges.length > 0
        ) {
          projectionRunId = await calculateAndSaveProjections();
          console.log('月次予測計算完了');
        } else {
          console.log('データが不足しているため、月次予測計算をスキップします');
        }

        // 7. 計算結果を取得して履歴を保存（オンボーディングで登録したデータを使用）
        let calculationResult: any = null;
        try {
          // 資産データを取得
          const { data: assetsData, error: assetsError } = await supabase
            .from('multiple_assets')
            .select('id, name, type, amount, annual_rate')
            .eq('user_id', user.id);

          if (assetsError) {
            throw assetsError;
          }

          if (assetsData && assetsData.length > 0) {
            // 年齢ベース計算を実行（オンボーディングで登録したデータを使用）
            const ageBasedResult = await calculateResults(
              assetsData.map((asset) => ({
                type: asset.type as 'cash' | 'stock',
                amount: asset.amount,
              }))
            );

            if (ageBasedResult && ageBasedResult.results.length > 0) {
              const firstResult = ageBasedResult.results[0];

              // 必要な値が存在するかチェック
              if (
                firstResult.yearsToTarget === undefined ||
                firstResult.yearsToTarget === null ||
                firstResult.averageRate === undefined ||
                firstResult.averageRate === null
              ) {
                console.error(
                  '計算結果に必要な値が不足しています:',
                  firstResult
                );
                throw new Error('計算結果が不正です');
              }

              const currentAssetsTotal = assetsData.reduce(
                (sum, asset) => sum + Number(asset.amount),
                0
              );

              // 資産詳細情報を作成（IDが有効なもののみ）
              const assetDetails = assetsData
                .filter((asset) => asset.id && asset.id.trim() !== '')
                .map((asset) => ({
                  id: asset.id,
                  name: asset.name || '資産',
                  type: asset.type,
                  originalAmount: Number(asset.amount),
                  adjustedAmount: Number(asset.amount),
                  annualRate: Number(asset.annual_rate) || 0,
                }));

              // 将来価値を計算（各資産を個別に計算して合計）
              const averageRate = Number(firstResult.averageRate);
              const rawYearsToTarget = Number(firstResult.yearsToTarget);
              // 月を含む正確な年数を使用（ageBasedCalculation.tsと同じ計算方法）
              const yearsForCalculation = firstResult.totalMonthsToTarget
                ? Number(firstResult.totalMonthsToTarget) / 12
                : rawYearsToTarget;

              if (
                !Number.isFinite(averageRate) ||
                !Number.isFinite(rawYearsToTarget) ||
                !Number.isFinite(yearsForCalculation)
              ) {
                console.error('計算結果が有限値ではありません:', {
                  averageRate: firstResult.averageRate,
                  yearsToTarget: firstResult.yearsToTarget,
                  totalMonthsToTarget: firstResult.totalMonthsToTarget,
                });
                throw new Error('計算結果が不正な数値です');
              }

              // 月次複利で計算された目標年齢時点の資産額を取得（グラフデータから）
              let futureValueFromProjections: number | null = null;
              if (projectionRunId) {
                try {
                  // 目標年齢の日付を取得
                  const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('birth_date')
                    .eq('user_id', user.id)
                    .maybeSingle();

                  const { data: calculationAges } = await supabase
                    .from('user_calculation_ages')
                    .select('target_age, target_month')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .order('display_order', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                  if (profile?.birth_date && calculationAges) {
                    const birthDate = new Date(profile.birth_date);
                    const targetYear =
                      birthDate.getFullYear() + calculationAges.target_age;
                    const targetMonth =
                      birthDate.getMonth() +
                      (calculationAges.target_month ?? 0);
                    // 目標年齢時点の月の1日を計算（履歴詳細画面と同じロジック）
                    const targetMonthDate = new Date(
                      targetYear,
                      targetMonth,
                      1
                    );
                    const targetMonthKey = `${targetMonthDate.getFullYear()}-${String(
                      targetMonthDate.getMonth() + 1
                    ).padStart(2, '0')}-01`;

                    // グラフデータから目標年齢時点の値を取得
                    // month_yearはdate型なので、文字列形式で検索可能
                    const { data: projections } = await supabase
                      .from('monthly_asset_projections')
                      .select('balance')
                      .eq('user_id', user.id)
                      .eq('projection_run_id', projectionRunId)
                      .eq('month_year', targetMonthKey);

                    if (projections && projections.length > 0) {
                      const totalBalance = projections.reduce(
                        (sum: number, p: { balance: number | string | null }) =>
                          sum + Number(p.balance ?? 0),
                        0
                      );
                      futureValueFromProjections = totalBalance;
                      if (__DEV__) {
                        console.log(
                          '[useOnboarding] グラフデータから取得した将来価値:',
                          futureValueFromProjections,
                          'targetMonthKey:',
                          targetMonthKey
                        );
                      }
                    }
                  }
                } catch (projectionError) {
                  console.error('グラフデータ取得エラー:', projectionError);
                }
              }

              // グラフデータから目標年齢時点の値を取得できなかった場合はエラー
              if (!projectionRunId || futureValueFromProjections === null) {
                throw new Error(
                  '目標年齢時点の資産額を取得できませんでした。グラフデータの計算に失敗している可能性があります。'
                );
              }

              const futureValue = futureValueFromProjections;

              if (__DEV__) {
                console.log('[useOnboarding] 将来価値:', {
                  月次複利: futureValueFromProjections,
                  使用値: futureValue,
                });
              }

              const increaseAmount = futureValue - currentAssetsTotal;

              // 履歴を保存（yearsToTargetが有効な数値であることを確認）
              const yearsToTarget = Math.max(1, Math.floor(rawYearsToTarget)); // 最低1年
              const historyId = await saveHistory(
                currentAssetsTotal,
                averageRate,
                yearsToTarget,
                futureValue,
                assetDetails,
                projectionRunId ?? undefined
              );

              if (historyId) {
                calculationResult = {
                  historyId,
                  currentAssets: currentAssetsTotal,
                  annualRate: firstResult.averageRate,
                  years: yearsToTarget,
                  futureValue,
                  increaseAmount,
                  createdAt: new Date().toISOString(),
                };

                console.log(
                  'オンボーディング完了: 計算結果を履歴に保存しました',
                  {
                    historyId,
                    currentAssets: currentAssetsTotal,
                    annualRate: firstResult.averageRate,
                    years: yearsToTarget,
                  }
                );
              }
            }
          }
        } catch (calcError: any) {
          console.error('計算結果取得エラー:', calcError);
          // 計算エラーでもオンボーディングは完了させる
        }

        // 全ての処理が完了したら、オンボーディング完了フラグをtrueに設定
        console.log(
          '【completeOnboarding】全ての処理が完了しました。onboarding_completedをtrueに設定します。'
        );
        try {
          await updateProfile({
            onboarding_completed: true,
          });
          console.log(
            '【completeOnboarding】onboarding_completedをtrueに設定しました。'
          );
        } catch (flagError: any) {
          console.error(
            '【completeOnboarding】onboarding_completedの設定に失敗しました:',
            flagError
          );
          // 完了フラグの設定に失敗しても、オンボーディングは成功として扱う
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return {
          success: true,
          message: 'オンボーディングが完了しました',
          data: calculationResult,
        };
      } catch (error: any) {
        console.error('オンボーディング完了エラー:', error);
        setState((prev) => ({
          ...prev,
          error: error.message || 'オンボーディングの完了に失敗しました',
          isLoading: false,
        }));
        return {
          success: false,
          message: error.message || 'オンボーディングの完了に失敗しました',
        };
      }
    }, [
      user?.id,
      profile,
      state.data,
      createProfile,
      updateProfile,
      addAsset,
      addAge,
      addPeriod,
      editPeriod,
      calculateAndSaveProjections,
      calculateResults,
      saveHistory,
    ]);

  // オンボーディング完了フラグの設定（ホームボタン押下時）
  const markOnboardingCompleted =
    useCallback(async (): Promise<OnboardingResult> => {
      if (!user?.id) {
        return { success: false, message: 'ユーザー情報が不足しています' };
      }

      try {
        await updateProfile({
          onboarding_completed: true,
        });

        return { success: true, message: 'オンボーディングが完了しました' };
      } catch (error: any) {
        console.error('オンボーディング完了フラグ設定エラー:', error);
        return {
          success: false,
          message: error.message || 'オンボーディング完了の設定に失敗しました',
        };
      }
    }, [user?.id, updateProfile]);

  return {
    state,
    isNewUser,
    profileLoading,
    saveStepData,
    nextStep,
    prevStep,
    completeOnboarding,
    markOnboardingCompleted,
  };
}
