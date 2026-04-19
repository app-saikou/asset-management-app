import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import {
  Info,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import type { UserBudgetPeriod } from '../../types/budget';

interface Step3Data {
  income?: { monthlyAmount: number };
  expense?: { monthlyAmount: number };
  investment?: { monthlyAmount: number };
}

interface OnboardingStep3Props {
  data: Step3Data;
  onComplete: (data: Required<Step3Data>) => void;
  currentStep?: number;
  periods: UserBudgetPeriod[];
  refetch: () => Promise<void>;
}

export interface OnboardingStep3Ref {
  getCurrentValues: () => Required<Step3Data>;
}

const OnboardingStep3 = forwardRef<OnboardingStep3Ref, OnboardingStep3Props>(
  ({ data, onComplete, currentStep, periods, refetch }, ref) => {
    // Step2と同じ構造: ローカル初期値で即描画 → DBデータ取得後に上書き
    // 単位統一: Sliderとstateをすべて「円」単位で統一（Step2と同じ）
    const [incomeAmount, setIncomeAmount] = useState(300000);
    const [expenseAmount, setExpenseAmount] = useState(200000);
    const [investmentAmount, setInvestmentAmount] = useState(100000);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // 前回値を記録（無限ループ防止）
    const prevValuesRef = useRef<{
      incomeAmount: number;
      expenseAmount: number;
      investmentAmount: number;
    } | null>(null);

    // onComplete()のデバウンス用タイマー（React Hooksで実装）
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 【key削除】keyによる再マウントをやめたため、key関連のstateとrefは不要
    // const incomeSliderKeyRef = useRef<number>(0);
    // const expenseSliderKeyRef = useRef<number>(0);
    // const investmentSliderKeyRef = useRef<number>(0);
    // const [incomeSliderKey, setIncomeSliderKey] = useState(0);
    // const [expenseSliderKey, setExpenseSliderKey] = useState(0);
    // const [investmentSliderKey, setInvestmentSliderKey] = useState(0);
    // const prevInitializedKeyRef = useRef(false);

    // onCompleteをuseRefに保存して、依存配列から除外（無限ループ防止）
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
      onCompleteRef.current = onComplete;
    }, [onComplete]);

    // スライダーの値をステップ値に最も近い値に丸める
    const snapToStep = useCallback((value: number) => {
      // 1万円単位で丸める
      return Math.round(value / 10000) * 10000;
    }, []);

    // 収入スライダーの初期化を強制するためのref（戻り遷移時にも正しく動作させるため）
    const incomeSliderMountedRef = useRef(false);
    // 支出スライダーの初期化を強制するためのref（戻り遷移時にも正しく動作させるため）
    const expenseSliderMountedRef = useRef(false);
    // 投資スライダーの初期化を強制するためのref（戻り遷移時にも正しく動作させるため）
    const investmentSliderMountedRef = useRef(false);

    // Step2と同じ構造: ステップ3になったときにデータベースから最新の値を取得
    useEffect(() => {
      if (currentStep === 3) {
        console.log(
          'ステップ3に戻ってきました。データベースから最新の値を取得します'
        );
        refetch();
        // isInitializedをリセットして、最新の値を反映させる（Step2と同じパターン）
        setIsInitialized(false);
        // スライダーの強制再設定を有効にするため、refをリセット
        incomeSliderMountedRef.current = false;
        expenseSliderMountedRef.current = false;
        investmentSliderMountedRef.current = false;
      }
    }, [currentStep, refetch]);

    // Step2と同じ構造: データベースから既存の予算データを取得して初期値に設定
    useEffect(() => {
      if (periods.length > 0 && !isInitialized) {
        const incomePeriod = periods.find((period) => period.type === 'income');
        const expensePeriod = periods.find(
          (period) => period.type === 'expense'
        );
        const investmentPeriod = periods.find(
          (period) => period.type === 'investment'
        );

        // すべてのPeriod（income、expense、investment）が揃っているか確認
        // 揃っていない場合は初期化を待つ
        if (!incomePeriod || !expensePeriod || !investmentPeriod) {
          console.log('【初期化待機】すべてのPeriodが揃うまで待機中', {
            incomePeriod: !!incomePeriod,
            expensePeriod: !!expensePeriod,
            investmentPeriod: !!investmentPeriod,
            periodsLength: periods.length,
          });
          return;
        }

        // すべてのPeriodが揃ったら、値を設定
        const newIncomeAmount = incomePeriod
          ? snapToStep(incomePeriod.monthly_amount)
          : 300000; // デフォルト値
        const newExpenseAmount = expensePeriod
          ? snapToStep(expensePeriod.monthly_amount)
          : 200000; // デフォルト値
        const newInvestmentAmount = investmentPeriod
          ? snapToStep(investmentPeriod.monthly_amount)
          : 100000; // デフォルト値

        console.log('【DB初期化】Periodから取得した値を設定', {
          収入: newIncomeAmount,
          支出: newExpenseAmount,
          投資: newInvestmentAmount,
        });

        // すべての値を同時に設定（スライダーのマウント前に値を確定させる）
        setIncomeAmount(newIncomeAmount);
        setExpenseAmount(newExpenseAmount);
        setInvestmentAmount(newInvestmentAmount);

        // 強制再設定を有効にするため、refをリセット
        incomeSliderMountedRef.current = false;
        expenseSliderMountedRef.current = false;
        investmentSliderMountedRef.current = false;

        // すべてのPeriodが揃った後に初期化完了
        setIsInitialized(true);

        // データベースから取得した値を親に通知（現在の値を使用）
        const finalIncomeAmount = incomePeriod
          ? snapToStep(incomePeriod.monthly_amount)
          : 300000; // デフォルト値
        const finalExpenseAmount = expensePeriod
          ? snapToStep(expensePeriod.monthly_amount)
          : 200000; // デフォルト値
        const finalInvestmentAmount = investmentPeriod
          ? snapToStep(investmentPeriod.monthly_amount)
          : 100000; // デフォルト値

        console.log('データベースから取得した値でスライダーを更新しました', {
          収入: incomePeriod?.monthly_amount,
          支出: expensePeriod?.monthly_amount,
          投資: investmentPeriod?.monthly_amount,
        });

        // 値が変更された場合のみ親に通知（無限ループ防止）
        const prev = prevValuesRef.current;
        const hasChanged =
          !prev ||
          prev.incomeAmount !== finalIncomeAmount ||
          prev.expenseAmount !== finalExpenseAmount ||
          prev.investmentAmount !== finalInvestmentAmount;

        if (hasChanged) {
          onCompleteRef.current({
            income: { monthlyAmount: finalIncomeAmount },
            expense: { monthlyAmount: finalExpenseAmount },
            investment: { monthlyAmount: finalInvestmentAmount },
          });
          prevValuesRef.current = {
            incomeAmount: finalIncomeAmount,
            expenseAmount: finalExpenseAmount,
            investmentAmount: finalInvestmentAmount,
          };
        }
      }
    }, [periods, snapToStep, isInitialized]);

    // Step2と同じ構造: propsからの初期値設定（フォールバック、一度だけ）
    useEffect(() => {
      if (
        !isInitialized &&
        periods.length === 0 &&
        (data?.income || data?.expense || data?.investment)
      ) {
        let finalIncomeAmount = 300000; // デフォルト値
        let finalExpenseAmount = 200000; // デフォルト値
        let finalInvestmentAmount = 100000; // デフォルト値

        if (data.income?.monthlyAmount !== undefined) {
          finalIncomeAmount = snapToStep(data.income.monthlyAmount);
          setIncomeAmount(finalIncomeAmount);
        }
        if (data.expense?.monthlyAmount !== undefined) {
          finalExpenseAmount = snapToStep(data.expense.monthlyAmount);
          setExpenseAmount(finalExpenseAmount);
        }
        if (data.investment?.monthlyAmount !== undefined) {
          finalInvestmentAmount = snapToStep(data.investment.monthlyAmount);
          setInvestmentAmount(finalInvestmentAmount);
        }

        setIsInitialized(true);

        console.log(
          '初期化完了: propsから取得した値でスライダーを更新しました',
          {
            収入: data.income?.monthlyAmount,
            支出: data.expense?.monthlyAmount,
            投資: data.investment?.monthlyAmount,
          }
        );

        // 値が変更された場合のみ親に通知（無限ループ防止）
        const prev = prevValuesRef.current;
        const hasChanged =
          !prev ||
          prev.incomeAmount !== finalIncomeAmount ||
          prev.expenseAmount !== finalExpenseAmount ||
          prev.investmentAmount !== finalInvestmentAmount;

        if (hasChanged) {
          // propsから取得した値を親に通知
          onCompleteRef.current({
            income: { monthlyAmount: finalIncomeAmount },
            expense: { monthlyAmount: finalExpenseAmount },
            investment: { monthlyAmount: finalInvestmentAmount },
          });
          prevValuesRef.current = {
            incomeAmount: finalIncomeAmount,
            expenseAmount: finalExpenseAmount,
            investmentAmount: finalInvestmentAmount,
          };
        }
      }
    }, [data, periods, isInitialized, snapToStep]);

    // 新規ユーザー用: データベースにもpropsにもデータがない場合、初期値で初期化を完了させる
    // Step2と同じ構造: これにより、初期値（30万/20万/10万）が確実に表示される
    useEffect(() => {
      if (
        !isInitialized &&
        periods.length === 0 &&
        !data?.income &&
        !data?.expense &&
        !data?.investment
      ) {
        // 初期値（30万/20万/10万）で初期化を完了
        const finalIncomeAmount = 300000;
        const finalExpenseAmount = 200000;
        const finalInvestmentAmount = 100000;

        console.log('【新規ユーザー初期化】初期値を設定', {
          収入: finalIncomeAmount,
          支出: finalExpenseAmount,
          投資: finalInvestmentAmount,
        });

        // すべての値を同時に設定（スライダーのマウント前に値を確定させる）
        setIncomeAmount(finalIncomeAmount);
        setExpenseAmount(finalExpenseAmount);
        setInvestmentAmount(finalInvestmentAmount);

        // 強制再設定を有効にするため、refをリセット
        incomeSliderMountedRef.current = false;
        expenseSliderMountedRef.current = false;
        investmentSliderMountedRef.current = false;

        setIsInitialized(true);

        console.log(
          '初期化完了: 新規ユーザーなので初期値（30万/20万/10万）で初期化しました',
          {
            収入: finalIncomeAmount,
            支出: finalExpenseAmount,
            投資: finalInvestmentAmount,
          }
        );

        // 値が変更された場合のみ親に通知（無限ループ防止）
        const prev = prevValuesRef.current;
        const hasChanged =
          !prev ||
          prev.incomeAmount !== finalIncomeAmount ||
          prev.expenseAmount !== finalExpenseAmount ||
          prev.investmentAmount !== finalInvestmentAmount;

        if (hasChanged) {
          // 初期値を親に通知（これにより親も初期値を認識する）
          onCompleteRef.current({
            income: { monthlyAmount: finalIncomeAmount },
            expense: { monthlyAmount: finalExpenseAmount },
            investment: { monthlyAmount: finalInvestmentAmount },
          });
          prevValuesRef.current = {
            incomeAmount: finalIncomeAmount,
            expenseAmount: finalExpenseAmount,
            investmentAmount: finalInvestmentAmount,
          };
        }
      }
    }, [periods, data, isInitialized]);

    // 親から最新の値を取得できるようにする
    useImperativeHandle(
      ref,
      () => ({
        getCurrentValues: () => ({
          income: { monthlyAmount: incomeAmount },
          expense: { monthlyAmount: expenseAmount },
          investment: { monthlyAmount: investmentAmount },
        }),
      }),
      [incomeAmount, expenseAmount, investmentAmount]
    );

    const formatAmount = (amount: number) => {
      if (amount >= 10000) {
        return `${(amount / 10000).toFixed(0)}万円`;
      } else {
        return `${amount.toLocaleString()}円`;
      }
    };

    // Step2と同じ構造: 単位統一により getSliderValue 関数は削除
    // Sliderは円単位で直接制御（value/maximumValue/stepすべて円単位）

    // 収入スライダーの変更ハンドラー（円単位で受け取り、1万円刻みに丸める）
    // Step2と同じ構造: 単位統一（円単位で受けて、snapToStepで丸めるだけ）
    const handleIncomeChange = useCallback(
      (value: number) => {
        // 単位統一: valueは既に円単位で来るため、丸めるだけ
        const snappedValue = snapToStep(value);
        if (snappedValue !== incomeAmount) {
          setIncomeAmount(snappedValue);

          // 制約: 収入が支出より少なくなった場合、支出も収入に合わせる（収入 >= 支出を保証）
          if (snappedValue < expenseAmount) {
            setExpenseAmount(snappedValue);
          }

          // 制約: 収入が支出+投資より少なくなった場合、投資も調整（収入 >= 支出 + 投資を保証）
          if (snappedValue < expenseAmount + investmentAmount) {
            const maxInvestment = Math.max(0, snappedValue - expenseAmount);
            setInvestmentAmount(maxInvestment);
          }
        }
      },
      [incomeAmount, expenseAmount, investmentAmount, snapToStep]
    );

    // 支出スライダーの変更ハンドラー（円単位で受け取り、1万円刻みに丸める）
    // Step2と同じ構造: 単位統一（円単位で受けて、snapToStepで丸めるだけ）
    const handleExpenseChange = useCallback(
      (value: number) => {
        // 単位統一: valueは既に円単位で来るため、丸めるだけ
        const snappedValue = snapToStep(value);
        if (snappedValue !== expenseAmount) {
          // 制約: 支出が収入を超えた場合、収入も支出に合わせる（収入 >= 支出を保証）
          if (snappedValue > incomeAmount) {
            setIncomeAmount(snappedValue);
          }

          setExpenseAmount(snappedValue);

          // 制約: 支出が変更された場合、投資も調整（収入 >= 支出 + 投資を保証）
          if (snappedValue + investmentAmount > incomeAmount) {
            const maxInvestment = Math.max(0, incomeAmount - snappedValue);
            setInvestmentAmount(maxInvestment);
          }
        }
      },
      [expenseAmount, incomeAmount, investmentAmount, snapToStep]
    );

    // 投資スライダーの変更ハンドラー（円単位で受け取り、1万円刻みに丸める）
    // 制約: 投資 <= 収入 - 支出を保証するため、収入または支出を自動調整する
    // 優先順位: 1. まず収入を増やす（上限100万円まで） 2. 収入が100万円なら支出を減らす
    const handleInvestmentChange = useCallback(
      (value: number) => {
        // 単位統一: valueは既に円単位で来るため、丸めるだけ
        const snappedValue = snapToStep(value);

        if (snappedValue !== investmentAmount) {
          // 制約: 投資 <= 収入 - 支出 を保証
          // 投資が収入-支出を超えそうになった場合の処理
          const requiredIncome = snappedValue + expenseAmount; // 必要な収入 = 投資 + 支出
          const incomeMax = 1000000; // 収入の上限

          if (requiredIncome > incomeAmount) {
            // 投資が収入-支出を超えそうになった場合
            if (requiredIncome <= incomeMax) {
              // 収入を増やせば解決できる場合（収入の上限100万円以内）
              setIncomeAmount(requiredIncome);
              setInvestmentAmount(snappedValue);
            } else {
              // 収入が100万円に達した場合、支出を減らす
              // 投資 + 支出 <= 100万円 となるように支出を調整
              const maxExpense = incomeMax - snappedValue;
              const adjustedExpense = Math.max(0, snapToStep(maxExpense));
              setExpenseAmount(adjustedExpense);
              setIncomeAmount(incomeMax);
              setInvestmentAmount(snappedValue);
            }
          } else {
            // 制約を満たしている場合、そのまま設定
            setInvestmentAmount(snappedValue);
          }
        }
      },
      [investmentAmount, incomeAmount, expenseAmount, snapToStep]
    );

    // 投資スライダーの上限値を計算（収入の上限100万円を超えないようにする）
    const maxInvestmentValue = useMemo(() => {
      // 投資の上限: 収入-支出（ただし、収入の上限100万円を超えないようにする）
      // 収入が100万円、支出が100万円の場合、投資の上限は0になる
      // 投資の物理的上限は50万円
      const availableInvestment = Math.max(0, incomeAmount - expenseAmount);
      return Math.min(500000, availableInvestment);
    }, [incomeAmount, expenseAmount]);

    // 収入や支出が変更されたときに、投資額が上限を超えていないかチェック
    // 超えている場合は自動的に上限に調整
    useEffect(() => {
      if (isInitialized && investmentAmount > maxInvestmentValue) {
        const adjustedInvestment = Math.max(0, snapToStep(maxInvestmentValue));
        setInvestmentAmount(adjustedInvestment);
        console.log('投資額が上限を超えていたため、自動調整しました', {
          旧投資額: investmentAmount,
          新投資額: adjustedInvestment,
          上限値: maxInvestmentValue,
        });
      }
    }, [
      incomeAmount,
      expenseAmount,
      maxInvestmentValue,
      isInitialized,
      investmentAmount,
      snapToStep,
    ]);

    // 初期化完了後、値が変わった時だけ親に通知（無限ループ防止）
    // Step2と同じ構造: デバウンス処理は維持（Step3は相互依存があるため）
    useEffect(() => {
      if (!isInitialized) return;

      const prev = prevValuesRef.current;
      const hasChanged =
        !prev ||
        prev.incomeAmount !== incomeAmount ||
        prev.expenseAmount !== expenseAmount ||
        prev.investmentAmount !== investmentAmount;

      if (hasChanged) {
        // 既存のタイマーをクリア（直前の変更が確定するまで待つ）
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // 150ms後にonCompleteを呼び出す（デバウンス）
        // この間に他のスライダーが変更されても、最後の変更のみが通知される
        debounceTimerRef.current = setTimeout(() => {
          console.log(
            'ステップ3: スライダーの値が変更されました。親に通知します（デバウンス後）',
            {
              収入: incomeAmount,
              支出: expenseAmount,
              投資: investmentAmount,
            }
          );

          onCompleteRef.current({
            income: { monthlyAmount: incomeAmount },
            expense: { monthlyAmount: expenseAmount },
            investment: { monthlyAmount: investmentAmount },
          });
          prevValuesRef.current = {
            incomeAmount,
            expenseAmount,
            investmentAmount,
          };
        }, 150);

        // クリーンアップ: コンポーネントのアンマウント時や値の再変更時にタイマーをクリア
        return () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
        };
      }
    }, [incomeAmount, expenseAmount, investmentAmount]);

    // 【key削除】keyによる再マウントをやめたため、この処理は不要
    // スライダーの内部stateを保持することで、0に戻る現象を防ぐ
    // useLayoutEffect(() => {
    //   // 初期化が完了した時のみ1回だけkeyを更新（無限ループ防止）
    //   if (
    //     isInitialized &&
    //     !prevInitializedKeyRef.current &&
    //     incomeAmount > 0 &&
    //     expenseAmount > 0 &&
    //     investmentAmount > 0
    //   ) {
    //     prevInitializedKeyRef.current = true;
    //     // すべての値が正しく設定されていることを確認してからkeyを更新
    //     console.log('【key更新】初期化完了: スライダーを再マウント', {
    //       収入: incomeAmount,
    //       支出: expenseAmount,
    //       投資: investmentAmount,
    //     });
    //     incomeSliderKeyRef.current += 1;
    //     expenseSliderKeyRef.current += 1;
    //     investmentSliderKeyRef.current += 1;
    //     setIncomeSliderKey(incomeSliderKeyRef.current);
    //     setExpenseSliderKey(expenseSliderKeyRef.current);
    //     setInvestmentSliderKey(investmentSliderKeyRef.current);
    //   } else if (!isInitialized) {
    //     // 初期化がリセットされた場合、prevInitializedKeyRefもリセット
    //     prevInitializedKeyRef.current = false;
    //   }
    // }, [isInitialized, incomeAmount, expenseAmount, investmentAmount]);

    // デバッグ: スライダーの値と上限値を確認
    useEffect(() => {
      console.log('【スライダーデバッグ】収入:', {
        実際の値: incomeAmount,
        上限値: 1000000,
        位置の割合: `${((incomeAmount / 1000000) * 100).toFixed(1)}%`,
        表示金額: formatAmount(incomeAmount),
      });
      console.log('【スライダーデバッグ】支出:', {
        実際の値: expenseAmount,
        上限値: 1000000,
        位置の割合: `${((expenseAmount / 1000000) * 100).toFixed(1)}%`,
        表示金額: formatAmount(expenseAmount),
      });
    }, [incomeAmount, expenseAmount]);

    // デバッグ: 収入スライダーの描画直前
    useEffect(() => {
      console.log('収入スライダーの描画直前', {
        incomeAmount,
        isInitialized,
        shouldRender: isInitialized && incomeAmount > 0,
        sliderValue: incomeAmount,
        sliderPosition: `${((incomeAmount / 1000000) * 100).toFixed(1)}%`,
      });
    }, [incomeAmount, isInitialized]);

    // デバッグ: 支出スライダーの描画直前
    useEffect(() => {
      console.log('支出スライダーの描画直前', {
        expenseAmount,
        isInitialized,
        shouldRender: isInitialized && expenseAmount > 0,
        sliderValue: expenseAmount,
        sliderPosition: `${((expenseAmount / 1000000) * 100).toFixed(1)}%`,
      });
    }, [expenseAmount, isInitialized]);

    // 収入スライダーの初期化を強制する
    // React Native Community Sliderの初期マウント時のバグを回避するため、
    // 初期化完了後に一度値をリセットしてから再設定する
    useLayoutEffect(() => {
      if (isInitialized && !incomeSliderMountedRef.current) {
        incomeSliderMountedRef.current = true;
        const currentIncomeAmount = incomeAmount;

        console.log(
          '【収入スライダー強制再設定】初期化完了後の強制再設定を実行',
          {
            現在の値: currentIncomeAmount,
            位置の割合: `${((currentIncomeAmount / 1000000) * 100).toFixed(
              1
            )}%`,
          }
        );

        // 一度0にリセットしてから元の値に再設定
        setIncomeAmount(0);
        requestAnimationFrame(() => {
          setIncomeAmount(currentIncomeAmount);
          console.log('【収入スライダー強制再設定】再設定完了', {
            再設定値: currentIncomeAmount,
            位置の割合: `${((currentIncomeAmount / 1000000) * 100).toFixed(
              1
            )}%`,
          });
        });
      }
    }, [isInitialized, incomeAmount]);

    // 支出スライダーの初期化を強制する
    // React Native Community Sliderの初期マウント時のバグを回避するため、
    // 初期化完了後に一度値をリセットしてから再設定する
    useLayoutEffect(() => {
      if (isInitialized && !expenseSliderMountedRef.current) {
        expenseSliderMountedRef.current = true;
        const currentExpenseAmount = expenseAmount;

        console.log(
          '【支出スライダー強制再設定】初期化完了後の強制再設定を実行',
          {
            現在の値: currentExpenseAmount,
          }
        );

        // 一度0にリセットしてから元の値に再設定
        setExpenseAmount(0);
        requestAnimationFrame(() => {
          setExpenseAmount(currentExpenseAmount);
          console.log('【支出スライダー強制再設定】再設定完了', {
            再設定値: currentExpenseAmount,
          });
        });
      }
    }, [isInitialized, expenseAmount]);

    // 投資スライダーの初期化を強制する
    // React Native Community Sliderの初期マウント時のバグを回避するため、
    // 初期化完了後に一度値をリセットしてから再設定する
    useLayoutEffect(() => {
      if (isInitialized && !investmentSliderMountedRef.current) {
        investmentSliderMountedRef.current = true;
        const currentInvestmentAmount = investmentAmount;

        console.log(
          '【投資スライダー強制再設定】初期化完了後の強制再設定を実行',
          {
            現在の値: currentInvestmentAmount,
          }
        );

        // 一度0にリセットしてから元の値に再設定
        setInvestmentAmount(0);
        requestAnimationFrame(() => {
          setInvestmentAmount(currentInvestmentAmount);
          console.log('【投資スライダー強制再設定】再設定完了', {
            再設定値: currentInvestmentAmount,
          });
        });
      }
    }, [isInitialized, investmentAmount]);

    // ツールチップを3秒後に自動的に閉じる
    useEffect(() => {
      if (showTooltip) {
        const timer = setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [showTooltip]);

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>毎月の予算はどのくらい？</Text>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              月々の収支・積立投資予算を教えてね
            </Text>
            <View style={styles.infoIconContainer}>
              <TouchableOpacity
                onPress={() => setShowTooltip(!showTooltip)}
                style={styles.infoIcon}
              >
                <Info size={16} color={Colors.semantic.text.secondary} />
              </TouchableOpacity>
              {showTooltip && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText} numberOfLines={1}>
                    予算はあとから変更できるよ
                  </Text>
                  <View style={styles.tooltipArrowOuter} />
                  <View style={styles.tooltipArrowInner} />
                </View>
              )}
            </View>
          </View>

          {/* 収入 */}
          <View style={styles.budgetSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <ArrowDownCircle size={24} color={Colors.primary[600]} />
                </View>
                <Text style={styles.sectionTitle}>収入</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.currentAmount}>
                  {formatAmount(incomeAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              {/* 単位統一: Step2と同じ構造 - value/maximumValue/stepすべて円単位 */}
              {/* 初期化完了後にスライダーをレンダリング（初期位置が正しく表示されるように） */}
              {isInitialized ? (
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1000000}
                  value={incomeAmount}
                  onValueChange={handleIncomeChange}
                  step={10000}
                  minimumTrackTintColor={Colors.primary[600]}
                  maximumTrackTintColor={Colors.semantic.border}
                />
              ) : (
                // 初期化中は空のViewを表示（レイアウトシフトを防ぐ）
                <View style={[styles.slider, { height: 32 }]} />
              )}
            </View>
          </View>

          {/* 支出 */}
          <View style={styles.budgetSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <ArrowUpCircle size={24} color={Colors.primary[600]} />
                </View>
                <Text style={styles.sectionTitle}>支出</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.currentAmount}>
                  {formatAmount(expenseAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              {/* 単位統一: Step2と同じ構造 - value/maximumValue/stepすべて円単位 */}
              {/* 初期化完了後にスライダーをレンダリング（初期位置が正しく表示されるように） */}
              {isInitialized ? (
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1000000}
                  value={expenseAmount}
                  onValueChange={handleExpenseChange}
                  step={10000}
                  minimumTrackTintColor={Colors.primary[600]}
                  maximumTrackTintColor={Colors.semantic.border}
                />
              ) : (
                // 初期化中は空のViewを表示（レイアウトシフトを防ぐ）
                <View style={[styles.slider, { height: 32 }]} />
              )}
            </View>
          </View>

          {/* 投資 */}
          <View style={styles.budgetSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <TrendingUp size={24} color={Colors.primary[600]} />
                </View>
                <Text style={styles.sectionTitle}>投資</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.currentAmount}>
                  {formatAmount(investmentAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              {/* 単位統一: Step2と同じ構造 - value/maximumValue/stepすべて円単位 */}
              {/* 初期化完了後にスライダーをレンダリング（初期位置が正しく表示されるように） */}
              {isInitialized ? (
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={500000} // 投資スライダーの上限値は固定50万円（視覚的な上限）
                  value={investmentAmount}
                  onValueChange={handleInvestmentChange}
                  step={10000}
                  minimumTrackTintColor={Colors.primary[600]}
                  maximumTrackTintColor={Colors.semantic.border}
                />
              ) : (
                // 初期化中は空のViewを表示（レイアウトシフトを防ぐ）
                <View style={[styles.slider, { height: 32 }]} />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }
);

OnboardingStep3.displayName = 'OnboardingStep3';

export default OnboardingStep3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoIconContainer: {
    marginLeft: 8,
    position: 'relative',
    zIndex: 1000,
  },
  infoIcon: {
    padding: 4,
  },
  tooltip: {
    position: 'absolute',
    bottom: 32,
    right: -17,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 172,
  },
  tooltipArrowOuter: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.semantic.border,
    borderBottomWidth: 0,
  },
  tooltipArrowInner: {
    position: 'absolute',
    bottom: -7,
    right: 21,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.semantic.surface,
    borderBottomWidth: 0,
  },
  tooltipText: {
    fontSize: 12,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
  budgetSection: {
    marginBottom: 16,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  amountContainer: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    minWidth: 100,
    alignItems: 'flex-end',
  },
  currentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[600],
    textAlign: 'right',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: 32,
    marginBottom: 0,
  },
  sliderThumb: {
    backgroundColor: Colors.primary[600],
    width: 18,
    height: 18,
  },
  sliderTrack: {
    height: 3,
    borderRadius: 2,
  },
});
