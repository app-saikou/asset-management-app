import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Info, User, Calendar } from 'lucide-react-native';
import BirthDateField from './BirthDateField';
import { Colors } from '../../constants/Colors';
import { useUserProfile } from '../../hooks/useAgeBasedCalculation';

interface OnboardingStep1Props {
  data: any;
  onComplete: (data: { name: string; birthDate: string }) => void;
}

export default function OnboardingStep1({
  data,
  onComplete,
}: OnboardingStep1Props) {
  const { profile } = useUserProfile();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date>(new Date(1990, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);

  // データベースから既存のプロフィール情報を取得して初期値に設定（一度だけ）
  useEffect(() => {
    if (!isInitialized && profile) {
      // 名前の初期値設定
      if (profile.name) {
        setName(profile.name);
      }

      // 生年月日の初期値設定
      if (profile.birth_date) {
        setBirthDate(new Date(profile.birth_date));
      }

      setIsInitialized(true);
    }
  }, [profile, isInitialized]);

  // propsからの初期値設定（フォールバック、一度だけ）
  useEffect(() => {
    if (!isInitialized && !profile && (data?.name || data?.birthDate)) {
      if (data.name) {
        setName(data.name);
      }
      if (data.birthDate) {
        setBirthDate(new Date(data.birthDate));
      }
      setIsInitialized(true);
    }
  }, [data, isInitialized, profile]);

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 年齢を計算する関数
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const currentAge = calculateAge(birthDate);

  // データが変更されたときにonCompleteを呼び出す
  useEffect(() => {
    if (name.trim() && birthDate) {
      // ローカル時間で日付文字列を作成（UTC問題を回避）
      const year = birthDate.getFullYear();
      const month = String(birthDate.getMonth() + 1).padStart(2, '0');
      const day = String(birthDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      onComplete({ name: name.trim(), birthDate: dateString });
    }
  }, [name, birthDate]); // onCompleteを依存配列から削除

  // ツールチップを3秒後に自動的に閉じる
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>あなたについて</Text>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>名前と生年月日を教えてください</Text>
          <View style={styles.infoIconContainer}>
            <TouchableOpacity
              onPress={() => setShowTooltip(!showTooltip)}
              style={styles.infoIcon}
            >
              <Info size={16} color={Colors.semantic.text.secondary} />
            </TouchableOpacity>
            {showTooltip && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText} numberOfLines={1}>
                  名前と生年月日はあとから変更できるよ
                </Text>
                <View style={styles.tooltipArrowOuter} />
                <View style={styles.tooltipArrowInner} />
              </View>
            )}
          </View>
        </View>

        {/* 名前入力 */}
        <View style={styles.inputSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <User size={24} color={Colors.primary[600]} />
              </View>
              <Text style={styles.inputLabel}>お名前</Text>
            </View>
          </View>
          <TextInput
            style={[styles.input, isNameFocused && styles.inputFocused]}
            value={name}
            onChangeText={setName}
            placeholder="お名前を入力"
            placeholderTextColor={Colors.semantic.text.secondary}
            autoFocus
            maxLength={50}
            onFocus={() => setIsNameFocused(true)}
            onBlur={() => setIsNameFocused(false)}
          />
        </View>

        {/* 生年月日入力 */}
        <View style={styles.inputSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Calendar size={24} color={Colors.primary[600]} />
              </View>
              <Text style={styles.inputLabel}>生年月日</Text>
            </View>
            <View style={styles.ageValueContainer}>
              <Text style={styles.currentValue}>{currentAge}歳</Text>
            </View>
          </View>
          <BirthDateField value={birthDate} onChange={setBirthDate} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoIconContainer: {
    marginLeft: 8,
    position: 'relative',
    zIndex: 1000,
  },
  infoIcon: {
    padding: 4,
  },
  tooltip: {
    position: 'absolute',
    bottom: 32,
    right: -17,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 232,
  },
  tooltipArrowOuter: {
    position: 'absolute',
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.semantic.border,
    borderBottomWidth: 0,
  },
  tooltipArrowInner: {
    position: 'absolute',
    bottom: -7,
    right: 21,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.semantic.surface,
    borderBottomWidth: 0,
  },
  tooltipText: {
    fontSize: 12,
    color: Colors.semantic.text.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: 24,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.semantic.text.primary,
    backgroundColor: Colors.semantic.background,
    textAlign: 'left',
  },
  inputFocused: {
    borderColor: Colors.primary[600],
    borderWidth: 2,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.semantic.background,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
  },
  ageValueContainer: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    minWidth: 84,
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[600],
    textAlign: 'right',
  },
});
