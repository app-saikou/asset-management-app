import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info, Flag, Target } from 'lucide-react-native';
import { HorizontalScrollPicker } from '../HorizontalScrollPicker';
import { Colors } from '../../constants/Colors';
import { useUserProfile } from '../../hooks/useAgeBasedCalculation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const DEFAULT_TARGET_AMOUNT = 20000000; // 2000万円
const MIN_AMOUNT = 1000000; // 100万円
const MAX_AMOUNT = 100000000; // 1億円
const AMOUNT_STEP = 100000; // 10万円刻み
const MAX_AGE = 100;

const snapToAmountStep = (amount: number) => {
  if (!Number.isFinite(amount)) return DEFAULT_TARGET_AMOUNT;
  return Math.round(Number(amount) / AMOUNT_STEP) * AMOUNT_STEP;
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

  const getCurrentAge = () => {
    if (!profile?.birth_date) return 30;
    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(age, 30);
  };

  const currentAge = getCurrentAge();
  const minSelectableAge = Math.min(currentAge + 1, MAX_AGE);

  const clampAge = useCallback(
    (value?: number) => {
      if (!Number.isFinite(value)) return minSelectableAge;
      return Math.min(Math.max(value as number, minSelectableAge), MAX_AGE);
    },
    [minSelectableAge]
  );

  const preferredInitialAge =
    currentAge < 65 ? 65 : Math.min(currentAge + 1, MAX_AGE);

  const initialTargetAge = data?.targetAge
    ? clampAge(data.targetAge)
    : Math.min(Math.max(preferredInitialAge, minSelectableAge), MAX_AGE);

  const [targetAge, setTargetAge] = useState<number>(initialTargetAge);
  const [targetAmount, setTargetAmount] = useState(
    snapToAmountStep(data?.targetAmount || DEFAULT_TARGET_AMOUNT)
  );
  const [isReady, setIsReady] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAgeTooltip, setShowAgeTooltip] = useState(false);
  const [showAmountTooltip, setShowAmountTooltip] = useState(false);

  const ageValues = useMemo(
    () => Array.from({ length: MAX_AGE - minSelectableAge + 1 }, (_, i) => i + minSelectableAge),
    [minSelectableAge]
  );

  const amountValues = useMemo(
    () => Array.from(
      { length: (MAX_AMOUNT - MIN_AMOUNT) / AMOUNT_STEP + 1 },
      (_, i) => MIN_AMOUNT + i * AMOUNT_STEP
    ),
    []
  );

  const formatAge = (age: number) => `${age}歳`;

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(0)}億円`;
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}万円`;
    return `${amount.toLocaleString()}円`;
  };

  const handleAgeChange = useCallback(
    (value: number) => {
      setTargetAge(clampAge(value));
    },
    [clampAge]
  );

  const handleAmountChange = useCallback((value: number) => {
    const bounded = Math.min(Math.max(snapToAmountStep(value), MIN_AMOUNT), MAX_AMOUNT);
    setTargetAmount(bounded);
  }, []);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const prevValuesRef = useRef<{ targetAge: number; targetAmount: number } | null>(null);

  const applyInitialValues = useCallback(
    (ageValue: number, amountValue: number, currentAgeOverride?: number) => {
      const effectiveCurrentAge = currentAgeOverride ?? currentAge;
      const effectiveMinSelectableAge = Math.min(effectiveCurrentAge + 1, MAX_AGE);
      const adjustedAge = Math.min(Math.max(ageValue, effectiveMinSelectableAge), MAX_AGE);
      const finalAmount = Math.min(
        Math.max(snapToAmountStep(amountValue), MIN_AMOUNT),
        MAX_AMOUNT
      );

      setTargetAge(adjustedAge);
      setTargetAmount(finalAmount);
      prevValuesRef.current = { targetAge: adjustedAge, targetAmount: finalAmount };
      onCompleteRef.current({ targetAge: adjustedAge, targetAmount: finalAmount });
    },
    [currentAge]
  );

  useEffect(() => {
    if (currentStep !== undefined && currentStep !== 4) return;
    setIsReady(false);
  }, [profile?.birth_date, currentStep]);

  useEffect(() => {
    if (currentStep !== undefined && currentStep !== 4) return;
    if (isReady) return;

    let isCancelled = false;

    const loadValues = async () => {
      const recalculatedCurrentAge = getCurrentAge();
      const recalculatedMinSelectableAge = Math.min(recalculatedCurrentAge + 1, MAX_AGE);
      const recalculatedPreferredInitialAge =
        recalculatedCurrentAge < 65 ? 65 : Math.min(recalculatedCurrentAge + 1, MAX_AGE);

      const adjustTargetAge = (age: number | null | undefined): number => {
        if (!Number.isFinite(age)) return recalculatedPreferredInitialAge;
        const v = age as number;
        if (v < recalculatedMinSelectableAge) return recalculatedMinSelectableAge;
        return Math.min(v, MAX_AGE);
      };

      const fallbackAge = adjustTargetAge(data?.targetAge) ?? recalculatedPreferredInitialAge;
      const fallbackAmount = Number(data?.targetAmount ?? DEFAULT_TARGET_AMOUNT);
      const hasLocalOverrides =
        typeof data?.targetAge === 'number' || typeof data?.targetAmount === 'number';

      if (hasLocalOverrides) {
        applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        if (!isCancelled) setIsReady(true);
        return;
      }

      if (!user?.id) {
        applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        if (!isCancelled) setIsReady(true);
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

        if (error) throw error;
        if (isCancelled) return;

        const record = existingTargets?.[0];
        if (record) {
          applyInitialValues(
            adjustTargetAge(record.target_age),
            Number(record.target_amount ?? fallbackAmount),
            recalculatedCurrentAge
          );
        } else {
          applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        }
        if (!isCancelled) setIsReady(true);
      } catch (error) {
        console.error('ステップ4: 目標設定の取得に失敗しました', error);
        if (isCancelled) return;
        applyInitialValues(fallbackAge, fallbackAmount, recalculatedCurrentAge);
        if (!isCancelled) setIsReady(true);
      }
    };

    loadValues();
    return () => { isCancelled = true; };
  }, [
    user?.id,
    currentStep,
    data?.targetAge,
    data?.targetAmount,
    preferredInitialAge,
    applyInitialValues,
    isReady,
    profile?.birth_date,
  ]);

  useEffect(() => {
    if (!isReady) return;
    if (!targetAge || !targetAmount) return;
    const prev = prevValuesRef.current;
    const hasChanged =
      !prev || prev.targetAge !== targetAge || prev.targetAmount !== targetAmount;
    if (hasChanged) {
      onCompleteRef.current({ targetAge, targetAmount });
      prevValuesRef.current = { targetAge, targetAmount };
    }
  }, [isReady, targetAge, targetAmount]);

  useEffect(() => {
    if (showTooltip) {
      const t = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showTooltip]);

  useEffect(() => {
    if (showAgeTooltip) {
      const t = setTimeout(() => setShowAgeTooltip(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showAgeTooltip]);

  useEffect(() => {
    if (showAmountTooltip) {
      const t = setTimeout(() => setShowAmountTooltip(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showAmountTooltip]);

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
            目標年齢と目標資産額を設定してください。
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
              <View style={[styles.sectionInfoIconContainer, { marginLeft: 8 }]}>
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

          <HorizontalScrollPicker
            values={ageValues}
            selectedValue={targetAge}
            onValueChange={handleAgeChange}
            formatValue={formatAge}
          />
        </View>

        {/* 目標資産額 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Target size={24} color={Colors.primary[600]} />
              </View>
              <Text style={styles.sectionTitle}>目標額</Text>
              <View style={[styles.sectionInfoIconContainer, { marginLeft: 8 }]}>
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

          <HorizontalScrollPicker
            values={amountValues}
            selectedValue={targetAmount}
            onValueChange={handleAmountChange}
            formatValue={formatAmount}
          />
        </View>
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
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 84,
    alignItems: 'flex-end',
  },
  amountValueContainer: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 120,
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[600],
    textAlign: 'right',
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
