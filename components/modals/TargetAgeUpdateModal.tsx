import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors } from '../../constants/Colors';
import {
  updateTargetAge,
  getRecommendedTargetAge,
} from '../../lib/targetAgeCheck';

interface TargetAgeUpdateModalProps {
  visible: boolean;
  currentAge: number;
  currentMonth: number;
  currentTargetAge: number;
  currentTargetMonth: number;
  onClose: () => void;
  onUpdate: (newTargetAge: number, newTargetMonth: number) => void;
}

export default function TargetAgeUpdateModal({
  visible,
  currentAge,
  currentMonth,
  currentTargetAge,
  currentTargetMonth,
  onClose,
  onUpdate,
}: TargetAgeUpdateModalProps) {
  const [newTargetAge, setNewTargetAge] = useState(
    getRecommendedTargetAge(currentAge)
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const minAge = currentAge + 1; // 現在年齢+1歳以上
  const maxAge = 100;

  const handleUpdate = async () => {
    if (newTargetAge <= currentAge) {
      Alert.alert('エラー', '目標年齢は現在年齢より大きく設定してください');
      return;
    }

    setIsUpdating(true);
    try {
      await updateTargetAge('', newTargetAge, 0); // userIdは呼び出し元で設定
      onUpdate(newTargetAge, 0);
      onClose();
    } catch (error) {
      console.error('Error updating target age:', error);
      Alert.alert('エラー', '目標年齢の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatAge = (age: number) => `${age}歳`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>目標年齢の更新が必要です</Text>
            <Text style={styles.subtitle}>
              現在年齢（{currentAge}歳{currentMonth}ヶ月）が目標年齢（
              {currentTargetAge}歳{currentTargetMonth}ヶ月）を上回っています
            </Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>新しい目標年齢を設定</Text>
            <Text style={styles.sectionDescription}>
              どの年齢での資産状況を知りたいですか？
            </Text>

            <View style={styles.sliderContainer}>
              <Text style={styles.currentAge}>{formatAge(newTargetAge)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={minAge}
                maximumValue={maxAge}
                value={newTargetAge}
                onValueChange={setNewTargetAge}
                step={1}
                minimumTrackTintColor={Colors.primary[600]}
                maximumTrackTintColor={Colors.semantic.border}
                thumbStyle={styles.sliderThumb}
                trackStyle={styles.sliderTrack}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>{formatAge(minAge)}</Text>
                <Text style={styles.sliderLabel}>{formatAge(maxAge)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isUpdating}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              <Text style={styles.updateButtonText}>
                {isUpdating ? '更新中...' : '更新'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 20,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  currentAge: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[600],
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: Colors.primary[600],
    width: 24,
    height: 24,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
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
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.semantic.border,
  },
  updateButton: {
    backgroundColor: Colors.primary[600],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.background,
  },
});
