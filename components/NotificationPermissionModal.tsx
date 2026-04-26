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
import { Bell } from 'lucide-react-native';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

export default function NotificationPermissionModal({
  visible,
  onAllow,
  onSkip,
}: NotificationPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            {/* アイコン */}
            <View style={styles.iconContainer}>
              <Bell size={48} color={Colors.primary[600]} />
            </View>

            {/* タイトル */}
            <Text style={styles.title}>毎月の資産チェックを習慣に</Text>

            {/* 本文 */}
            <Text style={styles.description}>
              Tanaoは月イチでの資産更新を推奨しています。通知で忘れ防止をしましょう。
              {'\n\n'}
              次に通知許可ダイアログが表示されます。
            </Text>

            {/* ボタン */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.allowButton}
                onPress={onAllow}
                activeOpacity={0.8}
              >
                <Text style={styles.allowButtonText}>続ける</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>後で</Text>
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
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  allowButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
});
