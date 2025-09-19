import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calculator,
  Edit,
  Trash2,
  TrendingUp,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useAssetHistory } from '../hooks/useAssetHistory';

export default function HistoryDetailScreen() {
  const params = useLocalSearchParams();
  const { deleteHistory, formatNumber } = useAssetHistory();
  const [deleting, setDeleting] = useState(false);

  const {
    id,
    currentAssets,
    annualRate,
    years,
    futureValue,
    increaseAmount,
    createdAt,
  } = params;

  // 日付フォーマット
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 再計算（計算画面に遷移）
  const handleRecalculate = () => {
    router.push({
      pathname: '/(tabs)',
      params: {
        currentAssets: currentAssets,
        annualRate: annualRate,
        years: years,
      },
    });
  };

  // 削除確認
  const handleDelete = () => {
    Alert.alert(
      '履歴を削除',
      'この履歴を削除しますか？この操作は取り消せません。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  // 削除実行
  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteHistory(id as string);
      router.back();
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '履歴の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.semantic.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 日時表示 */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {formatDateTime(createdAt as string)}
          </Text>
        </View>

        {/* メイン情報カード */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color={Colors.semantic.button.primary} />
            <Text style={styles.cardTitle}>資産計算結果</Text>
          </View>

          <View style={styles.resultContainer}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>現在資産</Text>
              <Text style={styles.resultValue}>
                ¥{formatNumber(Number(currentAssets))}
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <View style={styles.arrowLine} />
              <TrendingUp size={20} color={Colors.accent.success[500]} />
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>将来価値</Text>
              <Text style={[styles.resultValue, styles.futureValue]}>
                ¥{formatNumber(Number(futureValue))}
              </Text>
            </View>
          </View>

          <View style={styles.increaseContainer}>
            <Text style={styles.increaseLabel}>増加額</Text>
            <Text style={styles.increaseValue}>
              +¥{formatNumber(Number(increaseAmount))}
            </Text>
          </View>
        </View>

        {/* 条件詳細カード */}
        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>計算条件</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>年利</Text>
            <Text style={styles.detailValue}>{annualRate}%</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>運用期間</Text>
            <Text style={styles.detailValue}>{years}年</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>複利計算</Text>
            <Text style={styles.detailValue}>年1回</Text>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.recalculateButton}
            onPress={handleRecalculate}
            activeOpacity={0.8}
          >
            <Calculator size={20} color={Colors.semantic.background} />
            <Text style={styles.recalculateButtonText}>再計算</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            <Trash2 size={20} color={Colors.accent.error[500]} />
            <Text style={styles.deleteButtonText}>
              {deleting ? '削除中...' : '削除'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  dateText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  mainCard: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.base.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginLeft: 8,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  futureValue: {
    color: Colors.accent.success[600],
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  arrowLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.accent.success[500],
    marginRight: 8,
  },
  increaseContainer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  increaseLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 4,
  },
  increaseValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.accent.success[600],
  },
  detailCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  recalculateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.button.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  recalculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.background,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent.error[500],
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent.error[500],
  },
});
