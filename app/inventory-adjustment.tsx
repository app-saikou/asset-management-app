import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useInterstitialAdContext } from '../contexts/InterstitialAdContext';
import { supabase } from '../lib/supabase';
import { useAssetHistory } from '../hooks/useAssetHistory';
import { useCalculationAges } from '../hooks/useAgeBasedCalculation';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useProjection } from '../hooks/useProjection';
import { Colors } from '../constants/Colors';

interface Asset {
  id: string;
  name: string;
  type: 'cash' | 'stock';
  amount: number;
  adjustedAmount: number;
  annual_rate: number;
}

export default function InventoryAdjustmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showInterstitialAd } = useInterstitialAdContext();
  const { saveHistory } = useAssetHistory();
  const { calculateResults: calculateAgeResults } = useCalculationAges();
  const { calculateAndSaveProjections } = useProjection();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // 目標年齢設定アラート
  const showTargetAgeAlert = () => {
    Alert.alert(
      '目標年齢の設定が必要です',
      '現在年齢が目標年齢を上回っています。\n\nプロフィールで目標年齢を設定してください。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'プロフィールで設定',
          onPress: () => router.push('/(tabs)/profile'),
        },
      ]
    );
  };

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

        const formattedAssets = data.map((asset) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type as 'cash' | 'stock',
          amount: asset.amount,
          adjustedAmount: asset.amount,
          annual_rate: asset.annual_rate,
        }));

        setAssets(formattedAssets);
      } catch (error) {
        console.error('❌ 資産取得エラー:', error);
        Alert.alert('エラー', '資産データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [user]);

  // 金額調整
  const handleAmountChange = (assetId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const amount = numericValue === '' ? 0 : parseInt(numericValue, 10);

    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === assetId ? { ...asset, adjustedAmount: amount } : asset
      )
    );
  };

  // 変更があるかチェック
  const hasChanges = assets.some(
    (asset) => asset.adjustedAmount !== asset.amount
  );

  // 合計計算（年齢ベース計算を使用）
  const [totals, setTotals] = useState({
    originalTotal: 0,
    adjustedTotal: 0,
    originalFutureValue: 0,
    adjustedFutureValue: 0,
  });

  // 年齢ベース計算で合計を更新
  useEffect(() => {
    const calculateTotals = async () => {
      if (assets.length === 0) return;

      try {
        // 元の資産での計算
        const originalAssets = assets.map((asset) => ({
          type: asset.type,
          amount: asset.amount,
        }));

        // 調整後の資産での計算
        const adjustedAssets = assets.map((asset) => ({
          type: asset.type,
          amount: asset.adjustedAmount,
        }));

        // 年齢ベース計算を実行
        const originalResult = await calculateAgeResults(originalAssets);
        const adjustedResult = await calculateAgeResults(adjustedAssets);

        if (
          originalResult &&
          adjustedResult &&
          originalResult.results.length > 0 &&
          adjustedResult.results.length > 0
        ) {
          const originalTotal = assets.reduce(
            (sum, asset) => sum + asset.amount,
            0
          );
          const adjustedTotal = assets.reduce(
            (sum, asset) => sum + asset.adjustedAmount,
            0
          );

          setTotals({
            originalTotal,
            adjustedTotal,
            originalFutureValue: originalResult.results[0].futureValue,
            adjustedFutureValue: adjustedResult.results[0].futureValue,
          });
        }
      } catch (error) {
        console.error('年齢ベース計算エラー:', error);
        // エラーの場合は10年固定で計算
        const originalTotal = assets.reduce(
          (sum, asset) => sum + asset.amount,
          0
        );
        const adjustedTotal = assets.reduce(
          (sum, asset) => sum + asset.adjustedAmount,
          0
        );
        const originalFutureValue = assets.reduce(
          (sum, asset) =>
            sum +
            Math.round(
              asset.amount * Math.pow(1 + asset.annual_rate / 100, 10)
            ),
          0
        );
        const adjustedFutureValue = assets.reduce(
          (sum, asset) =>
            sum +
            Math.round(
              asset.adjustedAmount * Math.pow(1 + asset.annual_rate / 100, 10)
            ),
          0
        );

        setTotals({
          originalTotal,
          adjustedTotal,
          originalFutureValue,
          adjustedFutureValue,
        });
      }
    };

    calculateTotals();
  }, [assets, calculateAgeResults]);

  // 保存処理
  const handleSave = async () => {
    if (!hasChanges) {
      Alert.alert('変更なし', '調整する項目がありません。');
      return;
    }

    // 年齢チェック
    try {
      const testResult = await calculateAgeResults(
        assets.map((asset) => ({
          type: asset.type,
          amount: asset.adjustedAmount,
        }))
      );

      if (!testResult || testResult.results.length === 0) {
        Alert.alert('エラー', '計算結果が無効です');
        return;
      }
    } catch (error: any) {
      if (error.message.includes('現在年齢が目標年齢を上回っています')) {
        showTargetAgeAlert();
        return;
      }
      console.error('年齢ベース計算エラー:', error);
      Alert.alert('エラー', '計算中にエラーが発生しました');
      return;
    }

    try {
      // 広告を表示
      await showInterstitialAd(async () => {
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

            if (error) throw error;
          });

        await Promise.all(updatePromises);

        const projectionRunId = await calculateAndSaveProjections();

        // 月次複利で計算された目標年齢時点の資産額を取得（グラフデータから）
        let futureValueFromProjections: number | null = null;
        if (projectionRunId) {
          try {
            // 目標年齢の日付を取得
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
              // 目標年齢時点の月の1日を計算（履歴詳細画面と同じロジック）
              const targetMonthDate = new Date(targetYear, targetMonth, 1);
              const targetMonthKey = `${targetMonthDate.getFullYear()}-${String(
                targetMonthDate.getMonth() + 1
              ).padStart(2, '0')}-01`;

              // グラフデータから目標年齢時点の値を取得
              // month_yearはdate型なので、文字列形式で検索可能
              const { data: projections } = await supabase
                .from('monthly_asset_projections')
                .select('balance')
                .eq('user_id', user?.id)
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
                    '[inventory-adjustment] グラフデータから取得した将来価値:',
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

        // 履歴を保存
        const assetDetails = assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          originalAmount: asset.amount,
          adjustedAmount: asset.adjustedAmount,
          annualRate: asset.annual_rate ?? 0, // null/undefinedの場合は0を設定
        }));

        // グラフデータから目標年齢時点の値を取得できなかった場合はエラー
        if (!projectionRunId || futureValueFromProjections === null) {
          throw new Error(
            '目標年齢時点の資産額を取得できませんでした。グラフデータの計算に失敗している可能性があります。'
          );
        }

        const futureValue = futureValueFromProjections;

        if (__DEV__) {
          console.log('[inventory-adjustment] 将来価値:', {
            月次複利: futureValueFromProjections,
            使用値: futureValue,
          });
        }

        // annualRate: 調整後資産の加重平均利率（旧エンジン不要）
        const adjustedTotal = totals.adjustedTotal;
        const annualRate =
          adjustedTotal > 0
            ? assets.reduce(
                (sum, asset) =>
                  sum + (asset.annual_rate ?? 0) * asset.adjustedAmount,
                0
              ) / adjustedTotal
            : 0;

        // years・資産別残高を monthly_asset_projections から取得済みのデータで計算
        let years = 0;
        const assetProjections = new Map<string, number>();
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
            const now = new Date();
            const ageRaw = now.getFullYear() - birthDate.getFullYear();
            const hadBirthday =
              now.getMonth() > birthDate.getMonth() ||
              (now.getMonth() === birthDate.getMonth() &&
                now.getDate() >= birthDate.getDate());
            const currentAge = hadBirthday ? ageRaw : ageRaw - 1;
            years = calculationAges.target_age - currentAge;

            // 資産別残高を取得（asset_history_details に使用）
            const targetYear =
              birthDate.getFullYear() + calculationAges.target_age;
            const targetMonth =
              birthDate.getMonth() + (calculationAges.target_month ?? 0);
            const targetMonthDate = new Date(targetYear, targetMonth, 1);
            const targetMonthKey = `${targetMonthDate.getFullYear()}-${String(
              targetMonthDate.getMonth() + 1
            ).padStart(2, '0')}-01`;

            const { data: projections } = await supabase
              .from('monthly_asset_projections')
              .select('asset_id, balance')
              .eq('user_id', user?.id)
              .eq('projection_run_id', projectionRunId)
              .eq('month_year', targetMonthKey);

            if (projections) {
              for (const p of projections) {
                if (p.asset_id) assetProjections.set(p.asset_id, Number(p.balance ?? 0));
              }
            }
          }
        } catch (err) {
          console.error('years/assetProjections取得エラー:', err);
        }

        await saveHistory(
          totals.adjustedTotal,
          annualRate,
          years,
          futureValue,
          assetDetails,
          projectionRunId ?? undefined,
          assetProjections
        );

        // 履歴詳細画面に新規計算結果として遷移
        router.push(
          `/history-detail?isNewCalculation=true&calculationId=${Date.now()}`
        );
      });
    } catch (error) {
      console.error('❌ 保存エラー:', error);
      Alert.alert('エラー', 'データの保存に失敗しました。');
    }
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
          <Text style={styles.headerTitle}>棚卸し</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>読み込み中...</Text>
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
        <Text style={styles.headerTitle}>棚卸し</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* コンテンツ */}
      <ScrollView style={styles.content}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>調整前後の比較</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>調整前:</Text>
            <Text style={styles.summaryValue}>
              ¥{totals.originalTotal.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>調整後:</Text>
            <Text style={styles.summaryValue}>
              ¥{totals.adjustedTotal.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>差額:</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    totals.adjustedTotal - totals.originalTotal >= 0
                      ? '#4CAF50'
                      : '#F44336',
                },
              ]}
            >
              {totals.adjustedTotal - totals.originalTotal >= 0 ? '+' : ''}¥
              {(totals.adjustedTotal - totals.originalTotal).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* 資産リスト */}
        {assets.map((asset) => (
          <View key={asset.id} style={styles.assetCard}>
            <View style={styles.assetHeader}>
              <Text style={styles.assetName}>{asset.name}</Text>
              <Text style={styles.assetType}>
                {asset.type === 'cash' ? '現金' : '株式'}
              </Text>
            </View>

            <View style={styles.amountSection}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>現在の金額:</Text>
                <Text style={styles.amountValue}>
                  ¥{asset.amount.toLocaleString()}
                </Text>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>調整後:</Text>
                <TextInput
                  style={styles.amountInput}
                  value={asset.adjustedAmount.toString()}
                  onChangeText={(value) => handleAmountChange(asset.id, value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>差額:</Text>
                <Text
                  style={[
                    styles.amountValue,
                    {
                      color:
                        asset.adjustedAmount - asset.amount >= 0
                          ? '#4CAF50'
                          : '#F44336',
                    },
                  ]}
                >
                  {asset.adjustedAmount - asset.amount >= 0 ? '+' : ''}¥
                  {(asset.adjustedAmount - asset.amount).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 保存ボタン */}
      <View style={styles.saveSection}>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          disabled={!hasChanges}
        >
          <Save size={20} color={hasChanges ? '#fff' : '#999'} />
          <Text
            style={[
              styles.saveButtonText,
              !hasChanges && styles.saveButtonTextDisabled,
            ]}
          >
            保存
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginTop: -4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  assetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  assetType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  amountSection: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'right',
    minWidth: 120,
  },
  saveSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});
