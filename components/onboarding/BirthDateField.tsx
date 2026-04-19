import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';

interface BirthDateFieldProps {
  value?: Date;
  onChange: (date: Date) => void;
}

export default function BirthDateField({
  value,
  onChange,
}: BirthDateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value ?? new Date(1990, 0, 1)
  );

  const formatted = useMemo(() => {
    const d = value ?? new Date(1990, 0, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}年${m}月${day}日`;
  }, [value]);

  const handleOpenPicker = () => {
    setTempDate(value ?? new Date(1990, 0, 1));
    setShowPicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
    } else {
      // iOSでは一時的な値を更新
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  // 最大日付（今日）
  const maximumDate = new Date();
  // 最小日付（1900年1月1日）
  const minimumDate = new Date(1900, 0, 1);

  return (
    <View>
      <TouchableOpacity style={styles.field} onPress={handleOpenPicker}>
        <Text style={styles.value}>{formatted}</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        // iOS: モーダル内にピッカーを表示
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
          <View style={styles.iosModalOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.cancelButton}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>生年月日を選択</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmButton}>完了</Text>
              </TouchableOpacity>
            </View>
              <View style={styles.pickerWrapper}>
                <View style={styles.pickerInnerWrapper}>
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
        </View>
      </Modal>
      ) : (
        // Android: ネイティブのDatePickerDialogを表示
        showPicker && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.semantic.background,
    alignItems: 'center',
    minHeight: 52,
  },
  value: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: Colors.semantic.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  pickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  pickerInnerWrapper: {
    width: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ scaleX: 0.95 }],
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  confirmButton: {
    fontSize: 16,
    color: Colors.primary[600],
    fontWeight: '600',
  },
});
