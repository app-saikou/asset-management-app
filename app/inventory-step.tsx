import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Banknote,
  BarChart3,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useInterstitialAdContext } from '../contexts/InterstitialAdContext';
import { supabase } from '../lib/supabase';
import { useAssetHistory } from '../hooks/useAssetHistory';
import { useProjection } from '../hooks/useProjection';
import { useBudget } from '../hooks/useBudget';
import { Colors } from '../constants/Colors';
import {
  checkTargetAgeValidity,
  updateTargetAge,
  type TargetAgeCheckResult,
} from '../lib/targetAgeCheck';
import TargetAgeUpdateModal from '../components/modals/TargetAgeUpdateModal';

interface Asset {
  id: string;
  name: string;
  type: 'cash' | 'stock';
  amount: number;
  adjustedAmount: number;
  annualRate?: number;
}

interface Totals {
  originalTotal: number;
  adjustedTotal: number;
}

export default function InventoryStepScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showInterstitialAd } = useInterstitialAdContext();
  const { saveHistory } = useAssetHistory();
  const { calculateAndSaveProjections } = useProjection();
  const { checkInvalidBudgetPeriods } = useBudget();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [totals, setTotals] = useState<Totals>({
    originalTotal: 0,
    adjustedTotal: 0,
  });

  // 目標年齢チェック関連の状態
  const [showTargetAgeModal, setShowTargetAgeModal] = useState(false);
  const [targetAgeCheckResult, setTargetAgeCheckResult] =
    useState<TargetAgeCheckResult | null>(null);

  // 資産データを取得
  useEffect(() => {
    const fetchAssets = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('multiple_assets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const assetsData: Asset[] = data.map(
          (asset: {
            id: string;
            name: string;
            type: 'cash' | 'stock';
            amount: number;
            annual_rate?: number | null;
          }) => ({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            amount: asset.amount,
            adjustedAmount: asset.amount,
            annualRate: asset.annual_rate ?? 0, // データベースから取得した各資産の利率（nullの場合は0）
          })
        );

        setAssets(assetsData);
        setLoading(false);
      } catch (error) {
        console.error('資産取得エラー:', error);
        setLoading(false);
      }
    };

    fetchAssets();
  }, [user]);

  // 合計を計算
  useEffect(() => {
    const originalTotal = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const adjustedTotal = assets.reduce(
      (sum, asset) => sum + asset.adjustedAmount,
      0
    );

    setTotals({ originalTotal, adjustedTotal });
  }, [assets]);

  // 現在のステップの資産を取得
  const currentAsset = assets[currentStep];
  const isLastStep = currentStep === assets.length - 1;
  const isFirstStep = currentStep === 0;

  // 増減計算
  const diff = currentAsset
    ? currentAsset.adjustedAmount - currentAsset.amount
    : 0;

  // 全体の増減
  const diffTotal = totals.adjustedTotal - totals.originalTotal;

  // 資産の調整
  const handleAmountChange = (value: string) => {
    const newAmount = parseFloat(value) || 0;
    setAssets((prev) =>
      prev.map((asset, index) =>
        index === currentStep ? { ...asset, adjustedAmount: newAmount } : asset
      )
    );
  };

  // 次のステップへ
  const handleNext = () => {
    if (currentStep < assets.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 前のステップへ
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!user) return;

    // 変更があるかチェック
    const hasChanges = assets.some(
      (asset) => asset.amount !== asset.adjustedAmount
    );
    if (!hasChanges) {
      Alert.alert('変更なし', '調整内容がありません');
      return;
    }

    // 予算期間のバリデーション（最初にチェック - 画面遷移前に実行）
    const { hasInvalid, invalidPeriods } = await checkInvalidBudgetPeriods();

    console.log('予算期間バリデーション結果:', {
      hasInvalid,
      invalidPeriods,
    });

    if (hasInvalid) {
      Alert.alert(
        '登録済み予算の設定が必要です',
        '予算設定画面で資産を再設定してください。',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: () => {
              // 予算設定画面に遷移
              router.push('/(tabs)/profile');
            },
          },
        ]
      );
      return; // ここで処理を中断（画面遷移しない）
    }

    // 目標年齢チェック
    try {
      const ageCheckResult = await checkTargetAgeValidity(user.id);

      if (ageCheckResult.needsUpdate) {
        // 目標年齢の更新が必要な場合、モーダルを表示
        setTargetAgeCheckResult(ageCheckResult);
        setShowTargetAgeModal(true);
        return; // モーダルで更新されるまで待機
      }
    } catch (error) {
      console.error('目標年齢チェックエラー:', error);
      Alert.alert('エラー', '目標年齢の確認中にエラーが発生しました');
      return;
    }

    const proceedSave = async () => {
      // annualRate: 調整後資産の加重平均利率（旧エンジン不要）
      const adjustedTotal = totals.adjustedTotal;
      const annualRate =
        adjustedTotal > 0
          ? assets.reduce(
              (sum, a) => sum + (a.annualRate ?? 0) * a.adjustedAmount,
              0
            ) / adjustedTotal
          : 0;

      // 資産データを更新
      const updatePromises = assets
        .filter((asset) => asset.adjustedAmount !== asset.amount)
        .map(async (asset) => {
          const { error } = await supabase
            .from('multiple_assets')
            .update({
              amount: asset.adjustedAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', asset.id)
            .eq('user_id', user?.id);

          if (error) {
            console.error('資産更新エラー:', error);
            throw error;
          }
        });

      await Promise.all(updatePromises);

      // 月次予測を再計算・保存
      const projectionRunId = await calculateAndSaveProjections();

      // 月次複利で計算された目標年齢時点の資産額・資産別残高を取得
      let futureValueFromProjections: number | null = null;
      let years = 0;
      let savedTargetMonth: number | null = null;
      const assetProjections = new Map<string, number>();

      if (projectionRunId) {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('birth_date')
            .eq('user_id', user?.id)
            .maybeSingle();

          const { data: calculationAges } = await supabase
            .from('user_calculation_ages')
            .select('target_age, target_month')
            .eq('user_id', user?.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (profile?.birth_date && calculationAges) {
            const birthDate = new Date(profile.birth_date);
            const targetYear =
              birthDate.getFullYear() + calculationAges.target_age;
            const targetMonth =
              birthDate.getMonth() + (calculationAges.target_month ?? 0);
            const targetMonthDate = new Date(targetYear, targetMonth, 1);
            const targetMonthKey = `${targetMonthDate.getFullYear()}-${String(
              targetMonthDate.getMonth() + 1
            ).padStart(2, '0')}-01`;

            // years: 目標年齢 - 現在年齢（旧エンジン不要）
            const now = new Date();
            const ageRaw =
              now.getFullYear() - birthDate.getFullYear();
            const hadBirthday =
              now.getMonth() > birthDate.getMonth() ||
              (now.getMonth() === birthDate.getMonth() &&
                now.getDate() >= birthDate.getDate());
            const currentAge = hadBirthday ? ageRaw : ageRaw - 1;
            years = calculationAges.target_age - currentAge;
            savedTargetMonth = calculationAges.target_month ?? null;

            // 資産別残高も取得（asset_history_details に使用）
            const { data: projections } = await supabase
              .from('monthly_asset_projections')
              .select('asset_id, balance')
              .eq('user_id', user?.id)
              .eq('projection_run_id', projectionRunId)
              .eq('month_year', targetMonthKey);

            if (projections && projections.length > 0) {
              let totalBalance = 0;
              for (const p of projections) {
                const balance = Number(p.balance ?? 0);
                totalBalance += balance;
                if (p.asset_id) assetProjections.set(p.asset_id, balance);
              }
              futureValueFromProjections = totalBalance;
              if (__DEV__) {
                console.log(
                  '[inventory-step] グラフデータから取得した将来価値:',
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
        console.log('[inventory-step] 将来価値:', {
          月次複利: futureValueFromProjections,
          使用値: futureValue,
        });
      }

      const assetDetails = assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        originalAmount: asset.amount,
        adjustedAmount: asset.adjustedAmount,
        annualRate: asset.annualRate ?? 0,
      }));

      const historyId = await saveHistory(
        totals.adjustedTotal,
        annualRate,
        years,
        futureValue,
        assetDetails,
        projectionRunId ?? undefined,
        assetProjections,
        savedTargetMonth
      );

      // 履歴詳細画面に必要なパラメータを渡す
      const increaseAmount = futureValue - totals.adjustedTotal;

      router.push(
        `/history-detail?isNewCalculation=true&calculationId=${Date.now()}&id=${historyId}&currentAssets=${
          totals.adjustedTotal
        }&annualRate=${annualRate}&years=${years}&futureValue=${futureValue}&increaseAmount=${increaseAmount}&createdAt=${new Date().toISOString()}`
      );
    };

    try {
      // 広告を表示（閉じたら保存を実行）
      const adShown = await showInterstitialAd(async () => {
        try {
          await proceedSave();
        } catch (error) {
          console.error('保存エラー:', error);
          Alert.alert('エラー', 'データの保存に失敗しました');
        }
      });

      // 広告が表示されなかった場合は即座に保存
      if (!adShown) {
        await proceedSave();
      }
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました');
    }
  };

  // 目標年齢更新モーダルのハンドラー
  const handleTargetAgeUpdate = async (
    newTargetAge: number,
    newTargetMonth: number
  ) => {
    try {
      // 目標年齢を更新
      await updateTargetAge(user!.id, newTargetAge, newTargetMonth);

      // モーダルを閉じる
      setShowTargetAgeModal(false);
      setTargetAgeCheckResult(null);

      // 計算を再実行
      await handleSave();
    } catch (error) {
      console.error('目標年齢更新エラー:', error);
      Alert.alert('エラー', '目標年齢の更新に失敗しました');
    }
  };

  const handleTargetAgeModalClose = () => {
    setShowTargetAgeModal(false);
    setTargetAgeCheckResult(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>資産を更新</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>読み込み中...</Text>
        </View>
      </View>
    );
  }

  if (assets.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>資産を更新</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>資産が登録されていません</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{currentAsset?.name}を更新</Text>
          {/* ステップインジケーター */}
          <View style={styles.stepIndicator}>
            {assets.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  index === currentStep
                    ? styles.stepDotActive
                    : styles.stepDotInactive,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* コンテンツ */}
      <ScrollView style={styles.content}>
        {/* 調整前後の比較 */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>資産総額</Text>

          {/* 調整後の総額（メイン） */}
          <View style={styles.totalValueContainer}>
            <Text style={styles.totalValueLabel}>更新後</Text>
            <Text style={styles.totalValueMain}>
              ¥{totals.adjustedTotal.toLocaleString()}
            </Text>
          </View>

          <View style={styles.summarySubInfo}>
            {/* 調整前 */}
            <View style={styles.subInfoItem}>
              <Text style={styles.subInfoLabel}>更新前</Text>
              <Text style={styles.subInfoValue}>
                ¥{totals.originalTotal.toLocaleString()}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            {/* 増減 */}
            <View style={styles.subInfoItem}>
              <Text style={styles.subInfoLabel}>増減</Text>
              <View
                style={[
                  styles.diffBadgeSmall,
                  diffTotal > 0
                    ? styles.diffPositive
                    : diffTotal < 0
                    ? styles.diffNegative
                    : styles.diffNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.diffTextSmall,
                    diffTotal > 0
                      ? styles.textPositive
                      : diffTotal < 0
                      ? styles.textNegative
                      : styles.textNeutral,
                  ]}
                >
                  {diffTotal > 0 ? '+' : ''}¥
                  {Math.abs(diffTotal).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 現在の資産の詳細 */}
        {currentAsset && (
          <View style={styles.assetCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                {currentAsset.type === 'cash' ? (
                  <Banknote size={32} color={Colors.accent.info[500]} />
                ) : (
                  <BarChart3 size={32} color={Colors.accent.info[500]} />
                )}
              </View>
              <Text style={styles.assetName}>{currentAsset.name}</Text>
            </View>

            <View style={styles.cardBody}>
              {/* 現在の資産額 */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>現在の資産額</Text>
                <Text style={styles.infoValue}>
                  ¥{currentAsset.amount.toLocaleString()}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* 実際の金額入力 */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>実際の金額</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>¥</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={currentAsset.adjustedAmount.toString()}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.semantic.text.tertiary}
                  />
                </View>
              </View>

              {/* 増減表示 */}
              <View style={styles.diffContainer}>
                <Text style={styles.diffLabel}>増減</Text>
                <View
                  style={[
                    styles.diffBadge,
                    diff > 0
                      ? styles.diffPositive
                      : diff < 0
                      ? styles.diffNegative
                      : styles.diffNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.diffText,
                      diff > 0
                        ? styles.textPositive
                        : diff < 0
                        ? styles.textNegative
                        : styles.textNeutral,
                    ]}
                  >
                    {diff > 0 ? '+' : ''}¥{diff.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* フッター */}
      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          {!isFirstStep ? (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
            >
              <ArrowLeft size={20} color="#666" />
              <Text style={styles.previousButtonText}>戻る</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 1 }} />
          )}

          {!isLastStep ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>次へ</Text>
              <ArrowRight size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Check size={20} color="#fff" />
              <Text style={styles.saveButtonText}>完了</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 目標年齢更新モーダル */}
      {targetAgeCheckResult && (
        <TargetAgeUpdateModal
          visible={showTargetAgeModal}
          currentAge={targetAgeCheckResult.currentAge}
          currentMonth={targetAgeCheckResult.currentMonth}
          currentTargetAge={targetAgeCheckResult.targetAge}
          currentTargetMonth={targetAgeCheckResult.targetMonth}
          onClose={handleTargetAgeModalClose}
          onUpdate={handleTargetAgeUpdate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepDotActive: {
    backgroundColor: Colors.primary[500],
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotInactive: {
    backgroundColor: '#D1D1D6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summarySection: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
    marginBottom: 16,
  },
  totalValueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  totalValueLabel: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
    marginBottom: 4,
  },
  totalValueMain: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
  },
  summarySubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
  },
  subInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  subInfoLabel: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
  },
  subInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.semantic.border,
  },
  diffBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  diffTextSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  assetCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.semantic.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    flex: 1,
  },
  cardBody: {
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.semantic.border,
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.semantic.button.primary,
    paddingVertical: 8,
    gap: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    padding: 0,
  },
  diffContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  diffLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  diffBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  diffPositive: {
    backgroundColor: Colors.accent.success[50],
  },
  diffNegative: {
    backgroundColor: Colors.accent.error[50],
  },
  diffNeutral: {
    backgroundColor: Colors.base.gray100,
  },
  diffText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  textPositive: {
    color: Colors.accent.success[600],
  },
  textNegative: {
    color: Colors.accent.error[600],
  },
  textNeutral: {
    color: Colors.semantic.text.secondary,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  previousButtonText: {
    fontSize: 17,
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginRight: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
