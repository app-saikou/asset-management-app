import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Info, Flag, Target } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useUserProfile } from '../../hooks/useAgeBasedCalculation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const DEFAULT_TARGET_AMOUNT = 20000000; // 2000万円
const snapToAmountStep = (amount: number) => {
  if (!Number.isFinite(amount)) return DEFAULT_TARGET_AMOUNT;
  return Math.round(Number(amount) / 100000) * 100000;
};

interface Step4Data {
  targetAge?: number;
  targetAmount?: number;
}

interface OnboardingStep4Props {
  data: Step4Data;
  onComplete: (data: Required<Step4Data>) => void;
  currentStep?: number;
}

export default function OnboardingStep4({
  data,
  onComplete,
  currentStep,
}: OnboardingStep4Props) {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  // 現在年齢を計算
  const getCurrentAge = () => {
    if (!profile?.birth_date) return 30; // デフォルト年齢

    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return Math.max(age, 30); // 最低30歳
  };

  const currentAge = getCurrentAge();
  const maxAge = 100;

  const minSelectableAge = Math.min(currentAge + 1, maxAge);

  const clampAge = useCallback(
    (value?: number) => {
      if (!Number.isFinite(value)) {
        return minSelectableAge;
      }
      return Math.min(Math.max(value as number, minSelectableAge), maxAge);
    },
    [minSelectableAge, maxAge]
  );

  // 初期値の設定
  // 現在年齢が65歳未満の場合: 65歳
  // 現在年齢が65歳以上の場合: 現在年齢+1歳（最大100歳）
  const preferredInitialAge =
    currentAge < 65 ? 65 : Math.min(currentAge + 1, maxAge);

  // data?.targetAgeがある場合はclampAgeで制限、ない場合はpreferredInitialAgeをそのまま使用
  const initialTargetAge = data?.targetAge
    ? clampAge(data.targetAge)
    : Math.min(Math.max(preferredInitialAge, minSelectableAge), maxAge);

  const [targetAge, setTargetAge] = useState<number>(initialTargetAge);
  const [targetAmount, setTargetAmount] = useState(
    snapToAmountStep(data?.targetAmount || DEFAULT_TARGET_AMOUNT)
  );
  const [ageSliderValue, setAgeSliderValue] =
    useState<number>(initialTargetAge);
  const [amountSliderValue, setAmountSliderValue] = useState(
    snapToAmountStep(data?.targetAmount || DEFAULT_TARGET_AMOUNT)
  );
  const [isReady, setIsReady] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAgeTooltip, setShowAgeTooltip] = useState(false);
  const [showAmountTooltip, setShowAmountTooltip] = useState(false);
  const ageSliderInitializedRef = useRef(false);
  const amountSliderInitializedRef = useRef(false);

  // 金額の範囲設定
  const minAmount = 1000000; // 100万円
  const maxAmount = 100000000; // 1億円

  // 金額を万円単位でフォーマット（1億円以上は億円単位）
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      // 1億円以上は億円単位で表示
      return `${(amount / 100000000).toFixed(0)}億円`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}万円`;
    }
    return `${amount.toLocaleString()}円`;
  };

  // スライダーの値を1歳刻みにスナップ
  const snapToAge = (value: number) => {
    return Math.round(value);
  };

  const handleAgeChange = (value: number) => {
    const snappedValue = snapToAge(value);
    const finalAge = clampAge(snappedValue);
    setAgeSliderValue(finalAge);
    setTargetAge(finalAge);
  };

  // 金額スライダーのハンドラー（step境界へスナップ）
  const handleAmountChange = (value: number) => {
    const snappedValue = snapToAmountStep(value);
    const boundedAmount = Math.min(
      Math.max(snappedValue, minAmount),
      maxAmount
    );
    setAmountSliderValue(boundedAmount);
    setTargetAmount(boundedAmount);
  };

  // onCompleteをuseRefに保存して、依存配列から除外（無限ループ防止）
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const prevValuesRef = useRef<{
    targetAge: number;
    targetAmount: number;
  } | null>(null);

  const applyInitialValues = useCallback(
    (ageValue: number, amountValue: number, currentAgeOverride?: number) => {
      // 現在年齢が指定されている場合はそれを使用、なければコンポーネントの現在年齢を使用
      const effectiveCurrentAge = currentAgeOverride ?? currentAge;
      const effectiveMinSelectableAge = Math.min(
        effectiveCurrentAge + 1,
        maxAge
      );

      // 目標年齢を現在年齢に基づいて調整
      const adjustedAge = Math.min(
        Math.max(ageValue, effectiveMinSelectableAge),
        maxAge
      );

      const boundedAmount = Math.min(
        Math.max(amountValue, minAmount),
        maxAmount
      );
      const finalTargetAmount = snapToAmountStep(boundedAmount);

      setTargetAge(adjustedAge);
      setAgeSliderValue(adjustedAge);
      setTargetAmount(finalTargetAmount);
      setAmountSliderValue(finalTargetAmount);
      ageSliderInitializedRef.current = false;
      amountSliderInitializedRef.current = false;
      prevValuesRef.current = {
        targetAge: adjustedAge,
        targetAmount: finalTargetAmount,
      };
      onCompleteRef.current({
        targetAge: adjustedAge,
        targetAmount: finalTargetAmount,
      });
    },
    [currentAge, minAmount, maxAmount, maxAge]
  );

  // 生年月日が変更された場合にisReadyをリセット
  useEffect(() => {
    if (currentStep !== undefined && currentStep !== 4) {
      return;
    }
    // 生年月日が変更された場合は再計算のためisReadyをリセット
    setIsReady(false);
  }, [profile?.birth_date, currentStep]);

  useEffect(() => {
    if (currentStep !== undefined && currentStep !== 4) {
      return;
    }
    if (isReady) {
      return;
    }

    let isCancelled = false;

    const loadValues = async () => {
      // 現在年齢を再計算（ステップ1で年齢が変更された場合に対応）
      const recalculatedCurrentAge = getCurrentAge();
      const recalculatedMinSelectableAge = Math.min(
        recalculatedCurrentAge + 1,
        maxAge
      );

      // preferredInitialAgeも再計算
      const recalculatedPreferredInitialAge =
        recalculatedCurrentAge < 65
          ? 65
          : Math.min(recalculatedCurrentAge + 1, maxAge);

      // 目標年齢が現在年齢より若い場合は、現在年齢+1歳に調整
      const adjustTargetAge = (age: number | null | undefined): number => {
        if (!Number.isFinite(age)) {
          return recalculatedPreferredInitialAge;
        }
        const targetAgeValue = age as number;
        // 目標年齢が現在年齢以下（または現在年齢+1歳未満）の場合は調整
        if (targetAgeValue < recalculatedMinSelectableAge) {
          return recalculatedMinSelectableAge;
        }
        return Math.min(targetAgeValue, maxAge);
      };

      const fallbackAge =
        adjustTargetAge(data?.targetAge) ?? recalculatedPreferredInitialAge;
      const fallbackAmount = Number(
        data?.targetAmount ?? DEFAULT_TARGET_AMOUNT
      );
      const hasLocalOverrides =
        typeof data?.targetAge === 'number' ||
        typeof data?.targetAmount === 'number';

      if (hasLocalOverrides) {
        applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        if (!isCancelled) {
          setIsReady(true);
        }
        return;
      }

      if (!user?.id) {
        applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        if (!isCancelled) {
          setIsReady(true);
        }
        return;
      }

      try {
        const { data: existingTargets, error } = await supabase
          .from('user_calculation_ages')
          .select('target_age, target_amount')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1);

        if (error) {
          throw error;
        }

        if (isCancelled) return;

        const record = existingTargets?.[0];
        if (record) {
          // データベースから取得した値も現在年齢をチェックして調整
          const adjustedTargetAge = adjustTargetAge(record.target_age);
          applyInitialValues(
            adjustedTargetAge,
            Number(record.target_amount ?? fallbackAmount),
            recalculatedCurrentAge
          );
        } else {
          applyInitialValues(
            fallbackAge,
            fallbackAmount,
            recalculatedCurrentAge
          );
        }
        if (!isCancelled) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('ステップ4: 目標設定の取得に失敗しました', error);
        if (isCancelled) return;
        applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        if (!isCancelled) {
          setIsReady(true);
        }
      }
    };

    loadValues();

    return () => {
      isCancelled = true;
    };
  }, [
    user?.id,
    currentStep,
    data?.targetAge,
    data?.targetAmount,
    preferredInitialAge,
    applyInitialValues,
    isReady,
    profile?.birth_date, // 生年月日が変更された場合に再計算
    maxAge,
  ]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (targetAge && targetAmount) {
      const prev = prevValuesRef.current;
      const hasChanged =
        !prev ||
        prev.targetAge !== targetAge ||
        prev.targetAmount !== targetAmount;

      if (hasChanged) {
        onCompleteRef.current({
          targetAge: targetAge,
          targetAmount: targetAmount,
        });
        prevValuesRef.current = {
          targetAge,
          targetAmount,
        };
      }
    }
  }, [isReady, targetAge, targetAmount]);

  // ツールチップを3秒後に自動的に閉じる
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // 目標年齢のツールチップを3秒後に自動的に閉じる
  useEffect(() => {
    if (showAgeTooltip) {
      const timer = setTimeout(() => {
        setShowAgeTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAgeTooltip]);

  // 目標資産額のツールチップを3秒後に自動的に閉じる
  useEffect(() => {
    if (showAmountTooltip) {
      const timer = setTimeout(() => {
        setShowAmountTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAmountTooltip]);

  useLayoutEffect(() => {
    if (!isReady) return;
    if (ageSliderInitializedRef.current) return;
    ageSliderInitializedRef.current = true;
    const currentValue = targetAge;
    setAgeSliderValue(minSelectableAge);
    requestAnimationFrame(() => {
      setAgeSliderValue(currentValue);
    });
  }, [isReady, targetAge, minSelectableAge]);

  useLayoutEffect(() => {
    if (!isReady) return;
    if (amountSliderInitializedRef.current) return;
    amountSliderInitializedRef.current = true;
    const currentValue = targetAmount;
    setAmountSliderValue(minAmount);
    requestAnimationFrame(() => {
      setAmountSliderValue(currentValue);
    });
  }, [isReady, targetAmount, minAmount]);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>いつの資産が気になる？</Text>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            目標年齢と標資産額を設定してください。
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
                  目標年齢と目標資産額はあとから変更できるよ
                </Text>
                <View style={styles.tooltipArrowOuter} />
                <View style={styles.tooltipArrowInner} />
              </View>
            )}
          </View>
        </View>

        {/* 目標年齢 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Flag size={24} color={Colors.primary[600]} />
              </View>
              <Text style={styles.sectionTitle}>目標年齢</Text>
              <View
                style={[styles.sectionInfoIconContainer, { marginLeft: 8 }]}
              >
                <TouchableOpacity
                  onPress={() => setShowAgeTooltip(!showAgeTooltip)}
                  style={styles.sectionInfoIcon}
                >
                  <Info size={16} color={Colors.semantic.text.secondary} />
                </TouchableOpacity>
                {showAgeTooltip && (
                  <View style={styles.ageTooltip}>
                    <Text style={styles.sectionTooltipText} numberOfLines={1}>
                      何歳時点の資産額が気になりますか？
                    </Text>
                    <View style={styles.sectionTooltipArrowOuter} />
                    <View style={styles.sectionTooltipArrowInner} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.ageValueContainer}>
                <Text style={styles.currentValue}>{targetAge}歳</Text>
              </View>
            </View>
          </View>

          {/* スライダー */}
          <View style={styles.sliderContainer}>
            {isReady ? (
              <Slider
                key={`age-slider-${minSelectableAge}-${maxAge}`}
                style={styles.slider}
                minimumValue={minSelectableAge}
                maximumValue={maxAge}
                value={ageSliderValue}
                onValueChange={handleAgeChange}
                step={1}
                minimumTrackTintColor={Colors.primary[600]}
                maximumTrackTintColor={Colors.semantic.border}
              />
            ) : (
              <View style={styles.sliderPlaceholder} />
            )}
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>{minSelectableAge}歳</Text>
              <Text style={styles.sliderLabel}>{maxAge}歳</Text>
            </View>
          </View>
        </View>

        {/* 目標資産額 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Target size={24} color={Colors.primary[600]} />
              </View>
              <Text style={styles.sectionTitle}>目標額</Text>
              <View
                style={[styles.sectionInfoIconContainer, { marginLeft: 8 }]}
              >
                <TouchableOpacity
                  onPress={() => setShowAmountTooltip(!showAmountTooltip)}
                  style={styles.sectionInfoIcon}
                >
                  <Info size={16} color={Colors.semantic.text.secondary} />
                </TouchableOpacity>
                {showAmountTooltip && (
                  <View style={styles.amountTooltip}>
                    <Text style={styles.sectionTooltipText} numberOfLines={1}>
                      目標の資産額は？
                    </Text>
                    <View style={styles.sectionTooltipArrowOuter} />
                    <View style={styles.sectionTooltipArrowInner} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.amountValueContainer}>
                <Text style={styles.currentValue}>
                  {formatAmount(targetAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* スライダー */}
          <View style={styles.sliderContainer}>
            {isReady ? (
              <Slider
                style={styles.slider}
                minimumValue={minAmount}
                maximumValue={maxAmount}
                value={amountSliderValue}
                onValueChange={handleAmountChange}
                step={100000} // 10万円刻み
                minimumTrackTintColor={Colors.primary[600]}
                maximumTrackTintColor={Colors.semantic.border}
              />
            ) : (
              <View style={styles.sliderPlaceholder} />
            )}
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>{formatAmount(minAmount)}</Text>
              <Text style={styles.sliderLabel}>{formatAmount(maxAmount)}</Text>
            </View>
          </View>
        </View>

        {/* 目標設定のコツ: 非表示化 */}
      </View>
    </View>
  );
}

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
    right: -16,
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
    minWidth: 260,
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
  section: {
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
    flex: 1,
    paddingRight: 8,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionInfoIconContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  sectionInfoIcon: {
    padding: 4,
  },
  ageTooltip: {
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
    minWidth: 216,
  },
  amountTooltip: {
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
    minWidth: 116,
  },
  sectionTooltipArrowOuter: {
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
  sectionTooltipArrowInner: {
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
  sectionTooltipText: {
    fontSize: 12,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
  ageValueContainer: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    minWidth: 84,
    alignItems: 'flex-end',
  },
  amountValueContainer: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    minWidth: 120,
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[600],
    textAlign: 'right',
  },
  sliderContainer: {
    marginTop: 0,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderPlaceholder: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
});
