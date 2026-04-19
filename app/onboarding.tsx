import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { useUserProfile } from '../hooks/useAgeBasedCalculation';
import { useMultipleAssets } from '../hooks/useMultipleAssets';
import { useBudget } from '../hooks/useBudget';
import { Colors } from '../constants/Colors';
import OnboardingWelcome from '../components/onboarding/OnboardingWelcome';
import OnboardingStep1 from '../components/onboarding/OnboardingStep1';
import OnboardingStep2, {
  OnboardingStep2Ref,
} from '../components/onboarding/OnboardingStep2';
import OnboardingStep3, {
  OnboardingStep3Ref,
} from '../components/onboarding/OnboardingStep3';
import OnboardingStep4 from '../components/onboarding/OnboardingStep4';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { state, saveStepData, nextStep, prevStep, completeOnboarding } =
    useOnboarding();
  const { updateProfile, createProfile, profile } = useUserProfile();
  const { addAsset, updateAsset, assets } = useMultipleAssets();
  // useBudgetを親で呼び出し、periodsとrefetchをStep3にpropsで渡す
  // これにより、Step3と親で状態を共有し、再マウント時にも正しい値が保たれる
  const { addPeriod, editPeriod, periods, refetch } = useBudget();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [onboardingResult, setOnboardingResult] = useState<{
    success: boolean;
    data?: any;
    message?: string;
  } | null>(null);

  // ステップ2のref（最新の値を直接取得するため）
  const step2Ref = useRef<OnboardingStep2Ref>(null);
  // ステップ3のref（最新の値を直接取得するため）
  const step3Ref = useRef<OnboardingStep3Ref>(null);

  // 認証状況を確認

  // ユーザーが100歳になる年月を計算する関数
  const calculateEndDateAt100 = () => {
    if (!profile?.birth_date) {
      // 生年月日がない場合はデフォルトで2099年
      return '2099-12-31';
    }

    // タイムゾーンの問題を避けるため、文字列を直接パースして計算
    const [year, month, day] = profile.birth_date.split('-').map(Number);
    const endYear = year + 100;

    // YYYY-MM-DD形式で返す（タイムゾーンの影響を受けない）
    const endMonth = String(month).padStart(2, '0');
    const endDay = String(day).padStart(2, '0');
    return `${endYear}-${endMonth}-${endDay}`;
  };

  // ウェルカム画面を表示中の場合

  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <OnboardingWelcome onStart={() => setShowWelcome(false)} />
      </SafeAreaView>
    );
  }

  // ステップコンポーネントのマッピング
  const stepComponents = {
    1: OnboardingStep1,
    2: OnboardingStep2,
    3: OnboardingStep3,
    4: OnboardingStep4,
  };

  // 現在のステップコンポーネント
  const CurrentStepComponent =
    stepComponents[state.currentStep as keyof typeof stepComponents];

  // ステップの完了処理（ローカル保存のみ。DB保存はNext押下時）
  const handleStepComplete = async (stepData: any) => {
    saveStepData(stepData);
    // ここではDB保存も画面遷移も行わない
  };

  // ステップインジケーター
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.stepDot,
              index < state.currentStep
                ? styles.stepDotCompleted
                : styles.stepDotPending,
            ]}
          />
        ))}
      </View>
    );
  };

  // ナビゲーションボタン
  const renderNavigation = () => {
    // 戻るボタンのハンドラー
    const handleBack = () => {
      if (state.currentStep === 1) {
        // ステップ1の場合はウェルカム画面に戻る
        setShowWelcome(true);
      } else {
        // その他のステップの場合は前のステップに戻る
        prevStep();
      }
    };

    return (
      <View style={styles.navigationContainer}>
        {/* 常に戻るボタンを表示 */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          disabled={state.isLoading}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <View style={styles.navigationSpacer} />
        <TouchableOpacity
          style={styles.nextButton}
          onPress={async () => {
            // 次へ押下時にのみDB保存する
            try {
              if (state.currentStep === 1) {
                // ステップ1: 名前・生年月日を保存
                const name = state.data?.name?.trim();
                const birthDate = state.data?.birthDate; // 'YYYY-MM-DD'
                if (!name) {
                  Alert.alert('入力エラー', '名前を入力してください');
                  return;
                }
                if (!birthDate) {
                  Alert.alert('入力エラー', '生年月日を入力してください');
                  return;
                }

                // 年齢を計算して100歳以上かチェック
                const birth = new Date(birthDate);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (
                  monthDiff < 0 ||
                  (monthDiff === 0 && today.getDate() < birth.getDate())
                ) {
                  age--;
                }

                if (age >= 100) {
                  Alert.alert(
                    '入力エラー',
                    '年齢が100歳以上の場合はご利用いただけません'
                  );
                  return;
                }

                if (profile) {
                  await updateProfile({ name, birth_date: birthDate });
                } else {
                  await createProfile({
                    name,
                    birth_date: birthDate,
                    onboarding_completed: false,
                  });
                }
              } else if (state.currentStep === 2) {
                // ステップ2: 資産データを保存
                // refから最新の値を直接取得（setStateの非同期問題を回避）
                let cashAsset: { name: string; amount: number } | undefined;
                let stockAsset: { name: string; amount: number } | undefined;

                if (step2Ref.current) {
                  const currentValues = step2Ref.current.getCurrentValues();
                  cashAsset = currentValues.cashAsset;
                  stockAsset = currentValues.stockAsset;
                } else {
                  // refが取得できない場合はstate.dataから取得（フォールバック）
                  cashAsset = state.data?.cashAsset;
                  stockAsset = state.data?.stockAsset;
                }

                // データが不足している場合は、デフォルト値を設定
                if (!cashAsset || !stockAsset) {
                  const defaultCashAsset = { name: '現金', amount: 1000000 };
                  const defaultStockAsset = { name: '株式', amount: 1000000 };

                  // デフォルト値でデータベースに保存
                  const defaultCashResult = await addAsset(
                    'cash',
                    defaultCashAsset.name,
                    defaultCashAsset.amount,
                    0,
                    undefined
                  );
                  const defaultStockResult = await addAsset(
                    'stock',
                    defaultStockAsset.name,
                    defaultStockAsset.amount,
                    5,
                    undefined
                  );

                  if (!defaultCashResult || !defaultStockResult) {
                    Alert.alert('エラー', '資産の保存に失敗しました');
                    return;
                  }

                  await handleStepComplete({
                    cashAsset: defaultCashAsset,
                    stockAsset: defaultStockAsset,
                  });
                  nextStep();
                  return;
                }

                // 既存の資産をチェック
                const existingCashAsset = assets.find(
                  (asset) => asset.type === 'cash'
                );
                const existingStockAsset = assets.find(
                  (asset) => asset.type === 'stock'
                );

                // 現金資産を保存または更新
                let cashResult;
                if (existingCashAsset) {
                  cashResult = await updateAsset(existingCashAsset.id, {
                    name: cashAsset.name,
                    amount: cashAsset.amount,
                    annual_rate: 0,
                  });
                  if (cashResult) {
                  } else {
                    console.error('現金資産更新失敗');
                    Alert.alert('エラー', '現金資産の更新に失敗しました');
                    return;
                  }
                } else {
                  cashResult = await addAsset(
                    'cash',
                    cashAsset.name,
                    cashAsset.amount,
                    0, // annualRate
                    undefined // memo
                  );
                  if (cashResult) {
                  } else {
                    console.error('現金資産追加失敗');
                    Alert.alert('エラー', '現金資産の追加に失敗しました');
                    return;
                  }
                }

                // 株式資産を保存または更新
                let stockResult;
                if (existingStockAsset) {
                  stockResult = await updateAsset(existingStockAsset.id, {
                    name: stockAsset.name,
                    amount: stockAsset.amount,
                    annual_rate: 5,
                  });
                  if (stockResult) {
                  } else {
                    console.error('株式資産更新失敗');
                    Alert.alert('エラー', '株式資産の更新に失敗しました');
                    return;
                  }
                } else {
                  stockResult = await addAsset(
                    'stock',
                    stockAsset.name,
                    stockAsset.amount,
                    5, // annualRate: 株式は5%
                    undefined // memo
                  );
                  if (stockResult) {
                  } else {
                    console.error('株式資産追加失敗');
                    Alert.alert('エラー', '株式資産の追加に失敗しました');
                    return;
                  }
                }
              } else if (state.currentStep === 3) {
                // ステップ3: 予算データを保存
                // refから最新の値を直接取得（setStateの非同期問題を回避）
                let income: { monthlyAmount: number } | undefined;
                let expense: { monthlyAmount: number } | undefined;
                let investment: { monthlyAmount: number } | undefined;

                if (step3Ref.current) {
                  const currentValues = step3Ref.current.getCurrentValues();
                  income = currentValues.income;
                  expense = currentValues.expense;
                  investment = currentValues.investment;
                } else {
                  // refが取得できない場合はstate.dataから取得（フォールバック）
                  income = state.data?.income || { monthlyAmount: 300000 };
                  expense = state.data?.expense || { monthlyAmount: 200000 };
                  // state.dataからinvestmentを取得（型アサーション使用）
                  const investmentData = (state.data as any)?.investment;
                  investment = investmentData
                    ? { monthlyAmount: investmentData.monthlyAmount }
                    : { monthlyAmount: 100000 };
                }

                // データが存在するかチェック（デフォルト値でもOK）
                if (!income || !expense || !investment) {
                  Alert.alert('入力エラー', '予算データが不足しています');
                  return;
                }

                // 既存の予算期間をチェック
                const existingIncomePeriod = periods.find(
                  (period) => period.type === 'income'
                );
                const existingExpensePeriod = periods.find(
                  (period) => period.type === 'expense'
                );
                const existingInvestmentPeriod = periods.find(
                  (period) => period.type === 'investment'
                );

                // 収入予算を保存または更新
                let incomeResult;
                if (existingIncomePeriod) {
                  try {
                    incomeResult = await editPeriod(existingIncomePeriod.id, {
                      monthlyAmount: income.monthlyAmount,
                    });
                    if (!incomeResult) {
                      Alert.alert('エラー', '収入予算の更新に失敗しました');
                      return;
                    }
                  } catch (error: any) {
                    console.error('収入予算更新エラー:', error);
                    Alert.alert(
                      'エラー',
                      error.message || '収入予算の更新に失敗しました'
                    );
                    return;
                  }
                } else {
                  // 現金資産を取得（収入のターゲット）
                  const cashAsset = assets.find(
                    (asset) => asset.type === 'cash'
                  );
                  if (!cashAsset) {
                    Alert.alert('エラー', '現金資産が見つかりません');
                    return;
                  }

                  try {
                    incomeResult = await addPeriod({
                      type: 'income',
                      name: '収入',
                      startDate: new Date().toISOString().split('T')[0], // 今日から
                      endDate: calculateEndDateAt100(), // 100歳まで
                      monthlyAmount: income.monthlyAmount,
                      annualRate: 0,
                      targetAssetId: cashAsset.id,
                    });
                    if (!incomeResult) {
                      Alert.alert('エラー', '収入予算の追加に失敗しました');
                      return;
                    }
                  } catch (error: any) {
                    console.error('収入予算追加エラー:', error);
                    Alert.alert(
                      'エラー',
                      error.message || '収入予算の追加に失敗しました'
                    );
                    return;
                  }
                }

                // 支出予算を保存または更新
                let expenseResult;
                if (existingExpensePeriod) {
                  try {
                    expenseResult = await editPeriod(existingExpensePeriod.id, {
                      monthlyAmount: expense.monthlyAmount,
                    });
                    if (!expenseResult) {
                      Alert.alert('エラー', '支出予算の更新に失敗しました');
                      return;
                    }
                  } catch (error: any) {
                    console.error('支出予算更新エラー:', error);
                    Alert.alert(
                      'エラー',
                      error.message || '支出予算の更新に失敗しました'
                    );
                    return;
                  }
                } else {
                  // 現金資産を取得（支出のソース）
                  const cashAsset = assets.find(
                    (asset) => asset.type === 'cash'
                  );
                  if (!cashAsset) {
                    Alert.alert('エラー', '現金資産が見つかりません');
                    return;
                  }

                  try {
                    expenseResult = await addPeriod({
                      type: 'expense',
                      name: '支出',
                      startDate: new Date().toISOString().split('T')[0], // 今日から
                      endDate: calculateEndDateAt100(), // 100歳まで
                      monthlyAmount: expense.monthlyAmount,
                      annualRate: 0,
                      sourceAssetId: cashAsset.id,
                    });
                    if (!expenseResult) {
                      Alert.alert('エラー', '支出予算の追加に失敗しました');
                      return;
                    }
                  } catch (error: any) {
                    console.error('支出予算追加エラー:', error);
                    Alert.alert(
                      'エラー',
                      error.message || '支出予算の追加に失敗しました'
                    );
                    return;
                  }
                }

                // 投資予算を保存または更新
                let investmentResult;
                if (existingInvestmentPeriod) {
                  try {
                    investmentResult = await editPeriod(
                      existingInvestmentPeriod.id,
                      {
                        monthlyAmount: investment.monthlyAmount,
                      }
                    );
                    if (!investmentResult) {
                      Alert.alert('エラー', '投資予算の更新に失敗しました');
                      return;
                    }
                  } catch (error: any) {
                    console.error('投資予算更新エラー:', error);
                    Alert.alert(
                      'エラー',
                      error.message || '投資予算の更新に失敗しました'
                    );
                    return;
                  }
                } else {
                  // 現金資産と株式資産を取得
                  const cashAsset = assets.find(
                    (asset) => asset.type === 'cash'
                  );
                  const stockAsset = assets.find(
                    (asset) => asset.type === 'stock'
                  );
                  if (!cashAsset || !stockAsset) {
                    Alert.alert('エラー', '現金または株式資産が見つかりません');
                    return;
                  }

                  try {
                    investmentResult = await addPeriod({
                      type: 'investment',
                      name: '株式投資',
                      startDate: new Date().toISOString().split('T')[0], // 今日から
                      endDate: calculateEndDateAt100(), // 100歳まで
                      monthlyAmount: investment.monthlyAmount,
                      annualRate: 5,
                      sourceAssetId: cashAsset.id, // 現金から
                      targetAssetId: stockAsset.id, // 株式へ
                    });
                    if (!investmentResult) {
                      Alert.alert('エラー', '投資予算の追加に失敗しました');
                      return;
                    }
                  } catch (error: any) {
                    console.error('投資予算追加エラー:', error);
                    Alert.alert(
                      'エラー',
                      error.message || '投資予算の追加に失敗しました'
                    );
                    return;
                  }
                }
              }
            } catch (e) {
              console.error('ステップ3 保存エラー:', e);
              Alert.alert('エラー', '保存中に問題が発生しました');
              return;
            }

            if (state.currentStep < 4) {
              nextStep();
            } else {
              // ステップ4で「完了」
              setIsCompleting(true);
              const result = await completeOnboarding();
              setOnboardingResult(result);
              if (result.success) {
                // オンボーディング完了後、計算結果画面に直接遷移（通知許可モーダルはホーム画面遷移時に表示）
                setIsCompleting(false);
                if (result.data?.historyId) {
                  const {
                    historyId,
                    currentAssets,
                    annualRate,
                    years,
                    futureValue,
                    increaseAmount,
                    createdAt,
                  } = result.data;
                  router.push(
                    `/history-detail?isNewCalculation=true&isOnboarding=true&calculationId=${Date.now()}&id=${historyId}&currentAssets=${currentAssets}&annualRate=${annualRate}&years=${years}&futureValue=${futureValue}&increaseAmount=${increaseAmount}&createdAt=${createdAt}`
                  );
                } else {
                  // 計算結果がない場合
                  if (user?.is_anonymous === true) {
                    // 匿名ユーザーの場合はサインアップ画面に遷移
                    router.replace('/auth/signup');
                  } else {
                    // 通常ユーザーの場合はホーム画面に遷移（通知モーダル表示）
                    router.replace('/(tabs)?showNotificationModal=true');
                  }
                }
              } else {
                Alert.alert('エラー', result.message);
                setIsCompleting(false);
              }
            }
          }}
          disabled={state.isLoading || isCompleting}
        >
          <Text style={styles.nextButtonText}>
            {state.currentStep < 4 ? '次へ' : '完了'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.stepCounterContainer}>
          <Text style={styles.stepCounterLabel}>ステップ</Text>
          <Text style={styles.stepCounterNumber}>{state.currentStep}</Text>
          <Text style={styles.stepCounterTotal}>/ 4</Text>
        </View>
        {renderStepIndicator()}
      </View>

      {/* メインコンテンツ */}
      <View style={styles.content}>
        {state.currentStep === 2 ? (
          <OnboardingStep2
            ref={step2Ref}
            data={state.data}
            onComplete={handleStepComplete}
            currentStep={state.currentStep}
          />
        ) : state.currentStep === 3 ? (
          <OnboardingStep3
            ref={step3Ref}
            data={state.data}
            onComplete={handleStepComplete}
            currentStep={state.currentStep}
            periods={periods}
            refetch={refetch}
          />
        ) : CurrentStepComponent ? (
          // CurrentStepComponentはOnboardingStep1またはOnboardingStep4のみ
          // OnboardingStep3は個別にレンダリングされているため、periodsとrefetchは不要
          <CurrentStepComponent
            data={state.data}
            onComplete={handleStepComplete}
            currentStep={state.currentStep}
            {...({} as any)} // TypeScriptの型チェック回避（OnboardingStep3ではないことを保証）
          />
        ) : null}
      </View>

      {/* ナビゲーションボタン */}
      {renderNavigation()}

      {/* エラー表示 */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  stepCounterContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepCounterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
    marginRight: 8,
  },
  stepCounterNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  stepCounterTotal: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
    marginLeft: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  stepDotCompleted: {
    backgroundColor: Colors.primary[600],
  },
  stepDotPending: {
    backgroundColor: Colors.semantic.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: Colors.primary[600],
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  navigationSpacer: {
    flex: 1,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flex: 1,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  nextButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.accent.error[50],
  },
  errorText: {
    fontSize: 14,
    color: Colors.accent.error[600],
    textAlign: 'center',
  },
});
