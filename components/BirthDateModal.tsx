import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { X, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/Colors';
import type { CreateUserProfileData } from '../types/ageBasedCalculation';

interface BirthDateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CreateUserProfileData) => Promise<void>;
  currentBirthDate?: string;
}

export default function BirthDateModal({
  visible,
  onClose,
  onSave,
  currentBirthDate,
}: BirthDateModalProps) {
  const [birthDate, setBirthDate] = useState(
    currentBirthDate || new Date().toISOString().split('T')[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // currentBirthDateが変更されたとき、またはモーダルが開かれたときに状態を更新
  useEffect(() => {
    if (visible) {
      const initialDate =
        currentBirthDate || new Date().toISOString().split('T')[0];
      setBirthDate(initialDate);
      setTempDate(new Date(initialDate));
    }
  }, [currentBirthDate, visible]);

  const handleSave = async () => {
    try {
      // 生年月日の妥当性チェック
      const selectedDate = new Date(birthDate);
      const today = new Date();
      const age = today.getFullYear() - selectedDate.getFullYear();

      if (age < 0 || age > 120) {
        Alert.alert('エラー', '有効な生年月日を入力してください。');
        return;
      }

      if (age < 13) {
        Alert.alert('エラー', '13歳未満の方はご利用いただけません。');
        return;
      }

      await onSave({ birth_date: birthDate });
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '生年月日の保存に失敗しました。';
      Alert.alert('エラー', errorMessage);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleDateChange = (event: { type: string }, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        // ローカル時間で日付文字列を作成
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const newDate = `${year}-${month}-${day}`;
        setBirthDate(newDate);
      }
    } else {
      // iOS: 一時的な値を更新
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmDate = () => {
    // ローカル時間で日付文字列を作成
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, '0');
    const day = String(tempDate.getDate()).padStart(2, '0');
    const newDate = `${year}-${month}-${day}`;
    setBirthDate(newDate);
    setShowDatePicker(false);
  };

  // 最大日付（今日）
  const maximumDate = new Date();
  // 最小日付（1900年1月1日）
  const minimumDate = new Date(1900, 0, 1);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Calendar size={24} color={Colors.primary[500]} />
            <Text style={styles.headerTitle}>生年月日設定</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.semantic.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>生年月日</Text>
            <TouchableOpacity
              style={styles.dateInputContainer}
              onPress={() => {
                setTempDate(new Date(birthDate));
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.dateDisplay}>
                {formatDateForDisplay(birthDate)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 日付ピッカー */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>生年月日を選択</Text>
                <TouchableOpacity onPress={handleConfirmDate}>
                  <Text style={styles.pickerConfirmButtonText}>完了</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={maximumDate}
                  minimumDate={minimumDate}
                  locale="ja_JP"
                  textColor={Colors.semantic.text.primary}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
          />
        )
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  dateInputContainer: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    marginBottom: 8,
  },
  dateDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },

  // 日付ピッカーモーダル（iOS用）
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalContent: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
    backgroundColor: Colors.semantic.surface,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  pickerContainer: {
    padding: 0,
    backgroundColor: Colors.semantic.surface,
  },
  pickerCancelButtonText: {
    color: Colors.semantic.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  pickerConfirmButtonText: {
    color: Colors.primary[600],
    fontSize: 16,
    fontWeight: '600',
  },
});
