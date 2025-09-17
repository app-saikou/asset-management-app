import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { TrendingUp, Wallet } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useAssets } from '../../hooks/useAssets';
// import KeyboardDismissView from '../../components/KeyboardDismissView';
// import Toast from '../../components/Toast';

export default function CalculatorScreen() {
  const [inputValue, setInputValue] = useState('');
  const [futureValue, setFutureValue] = useState<number | null>(null);
  const { user, loading } = useAuth();
  const {
    currentAssets,
    loading: assetsLoading,
    error: assetsError,
    saveAssets,
  } = useAssets();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading]);

  // データベースから取得した資産額を入力欄に反映
  React.useEffect(() => {
    if (currentAssets > 0 && !isNaN(currentAssets) && isFinite(currentAssets)) {
      setInputValue(currentAssets.toString());
    }
  }, [currentAssets]);

  // const showToastMessage = (message: string) => {
  //   setToastMessage(message);
  //   setShowToast(true);
  // };

  const calculateFutureValue = async () => {
    const assets = parseFloat(inputValue);

    if (
      isNaN(assets) ||
      assets <= 0 ||
      !isFinite(assets) ||
      assets > 999999999999
    ) {
      Alert.alert('エラー', '有効な資産額を入力してください（0円〜999兆円）');
      return;
    }

    try {
      // 資産額をデータベースに保存
      await saveAssets(assets);

      // Formula: future_value = current_assets * (1 + 0.05) ^ 10
      const result = assets * Math.pow(1.05, 10);

      // 結果の検証
      if (isNaN(result) || !isFinite(result) || result < 0) {
        Alert.alert('エラー', '計算結果が無効です');
        return;
      }

      setFutureValue(result);
    } catch (error) {
      Alert.alert('エラー', '資産額の保存に失敗しました');
    }
  };

  const formatNumber = (num: number) => {
    // 安全な数値フォーマット
    if (isNaN(num) || !isFinite(num) || num < 0) {
      return '0';
    }

    // 非常に大きな数値の場合は安全な範囲に制限
    const safeNum = Math.min(Math.max(num, 0), 999999999999);
    const roundedNum = Math.round(safeNum);

    try {
      // シンプルな数値フォーマット（正規表現を使わない）
      return roundedNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } catch (error) {
      // 最終フォールバック
      return roundedNum.toString();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // エラー表示
  if (assetsError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{assetsError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // アプリを再起動する代わりに、エラー状態をリセット
              setError(null);
            }}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // console.log('KeyboardDismissView:', KeyboardDismissView);
  // console.log('Toast:', Toast);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>資産計算ツール</Text>
            <Text style={styles.subtitle}>
              10年後の資産価値を計算します（年利5%）
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>現在の資産額</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencyIcon}>¥</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="例: 1000000"
                    placeholderTextColor={Colors.base.gray400}
                    value={inputValue}
                    onChangeText={setInputValue}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.calculateButton}
                onPress={calculateFutureValue}
              >
                <TrendingUp
                  size={18}
                  color={Colors.semantic.text.inverse}
                  style={styles.buttonIcon}
                />
                <Text style={styles.calculateButtonText}>計算する</Text>
              </TouchableOpacity>
            </View>

            {futureValue !== null && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <TrendingUp size={24} color={Colors.accent.success[500]} />
                  <Text style={styles.resultTitle}>計算結果</Text>
                </View>

                <View style={styles.resultContent}>
                  <Text style={styles.resultText}>10年後、あなたの資産は</Text>
                  <Text style={styles.resultAmount}>
                    {formatNumber(futureValue)}円
                  </Text>
                  <Text style={styles.resultSubtext}>になります</Text>
                </View>

                <View style={styles.calculationDetails}>
                  <Text style={styles.detailsTitle}>計算詳細</Text>
                  <Text style={styles.detailsText}>
                    現在の資産: {formatNumber(parseFloat(inputValue))}円
                  </Text>
                  <Text style={styles.detailsText}>年利: 5%</Text>
                  <Text style={styles.detailsText}>期間: 10年</Text>
                  <Text style={styles.detailsText}>
                    増加額: {formatNumber(futureValue - parseFloat(inputValue))}
                    円
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* <Toast
        message={toastMessage}
        type="success"
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={3000}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.semantic.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.semantic.background,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 30,
  },
  inputSection: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.base.gray700,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  currencyIcon: {
    fontSize: 18,
    color: Colors.base.gray500,
    fontWeight: '600',
    marginRight: 8,
  },
  calculateButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  buttonIcon: {
    marginRight: 12,
  },
  calculateButtonText: {
    color: Colors.semantic.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    marginTop: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginLeft: 12,
  },
  resultContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
  },
  resultAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.accent.success[600],
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
  calculationDetails: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 4,
  },
});
