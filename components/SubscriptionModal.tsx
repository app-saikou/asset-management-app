import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Crown, Check } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function SubscriptionModal({
  visible,
  onClose,
  onUpgrade,
}: SubscriptionModalProps) {
  const features = [
    '利率のカスタマイズ',
    '高度な分析機能',
    'データエクスポート',
    '優先サポート',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Crown size={24} color={Colors.primary[500]} />
            <Text style={styles.headerTitle}>Proプラン</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.semantic.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* 価格 */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>¥980</Text>
            <Text style={styles.pricePeriod}>/月</Text>
          </View>

          {/* 説明 */}
          <Text style={styles.description}>
            より高度な資産管理機能を利用して、あなたの投資戦略を最適化しましょう。
          </Text>

          {/* 機能一覧 */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Proプランの機能</Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Check size={16} color={Colors.accent.success[500]} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* アップグレードボタン */}
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <Text style={styles.upgradeButtonText}>
              Proプランにアップグレード（開発中）
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  pricePeriod: {
    fontSize: 18,
    color: Colors.semantic.text.secondary,
    marginLeft: 4,
  },
  description: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  upgradeButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
});
