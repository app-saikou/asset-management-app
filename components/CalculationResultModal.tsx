import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, TrendingUp, Lightbulb } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface CalculationResult {
  currentAssets: number;
  futureValue: number;
  annualRate: number;
  years: number;
  increaseAmount: number;
}

interface CalculationResultModalProps {
  visible: boolean;
  result: CalculationResult | null;
  onClose: () => void;
  formatNumber: (num: number) => string;
  onAdjust?: () => void;
}

export default function CalculationResultModal({
  visible,
  result,
  onClose,
  formatNumber,
  onAdjust,
}: CalculationResultModalProps) {
  if (!result) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>棚卸し計算結果</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.semantic.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <TrendingUp size={24} color={Colors.accent.success[500]} />
              <Text style={styles.resultTitle}>計算結果</Text>
            </View>

            <View style={styles.resultContent}>
              <Text style={styles.resultText}>
                {result.years}年後、あなたの資産は
              </Text>
              <Text style={styles.resultAmount}>
                ¥{formatNumber(result.futureValue)}
              </Text>
              <Text style={styles.resultSubtext}>になります</Text>
            </View>

            <View style={styles.increaseContainer}>
              <Text style={styles.increaseLabel}>増加額</Text>
              <Text style={styles.increaseValue}>
                +¥{formatNumber(result.increaseAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>計算詳細</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>現在の総資産</Text>
              <Text style={styles.detailValue}>
                ¥{formatNumber(result.currentAssets)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>想定年利</Text>
              <Text style={styles.detailValue}>{result.annualRate}%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>運用期間</Text>
              <Text style={styles.detailValue}>{result.years}年</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>複利計算</Text>
              <Text style={styles.detailValue}>年1回</Text>
            </View>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteTitleContainer}>
              <Lightbulb size={16} color={Colors.semantic.button.primary} />
              <Text style={styles.noteTitle}>ポイント</Text>
            </View>
            <Text style={styles.noteText}>
              この計算は現在の総資産額を基に、年利{result.annualRate}%で
              {result.years}年間運用した場合のシミュレーションです。
              実際の投資結果は市場状況により変動します。
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {onAdjust && (
            <TouchableOpacity style={styles.adjustButton} onPress={onAdjust}>
              <Text style={styles.adjustButtonText}>資産を調整</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
            <Text style={styles.confirmButtonText}>確認</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  resultCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  resultContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  resultAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.accent.success[600],
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
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
    fontSize: 24,
    fontWeight: '700',
    color: Colors.accent.success[600],
  },
  detailsCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  noteCard: {
    backgroundColor: `${Colors.semantic.button.primary}08`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${Colors.semantic.button.primary}20`,
  },
  noteTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  noteText: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    gap: 12,
  },
  adjustButton: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.button.primary,
  },
  adjustButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.button.primary,
  },
  confirmButton: {
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
});
