import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Settings, ArrowRight } from 'lucide-react-native';

interface NotificationSettingsModalProps {
  visible: boolean;
  onOpenSettings: () => void;
  onCancel: () => void;
}

export default function NotificationSettingsModal({
  visible,
  onOpenSettings,
  onCancel,
}: NotificationSettingsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            {/* アイコン */}
            <View style={styles.iconContainer}>
              <Settings size={48} color={Colors.primary[600]} />
            </View>

            {/* タイトル */}
            <Text style={styles.title}>通知を有効にするには</Text>

            {/* 本文 */}
            <Text style={styles.description}>
              設定アプリで通知を許可してください。
            </Text>

            {/* 手順リスト */}
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>設定アプリを開く</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>アプリからTanaoを選択</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>通知を許可する</Text>
              </View>
            </View>

            {/* ボタン */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.openSettingsButton}
                onPress={onOpenSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.openSettingsButtonText}>設定を開く</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  content: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  stepsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.text.primary,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  openSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  openSettingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
});
