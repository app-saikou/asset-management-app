import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  DollarSign,
  TrendingUp,
  Building2,
  PiggyBank,
  Lightbulb,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { AssetType } from '../hooks/useMultipleAssets';

interface AddAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    type: AssetType,
    name: string,
    amount: number,
    annualRate: number,
    memo?: string
  ) => Promise<void>;
}

interface AssetTypeOption {
  type: AssetType;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  examples: string[];
}

export default function AddAssetModal({
  visible,
  onClose,
  onSave,
}: AddAssetModalProps) {
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [annualRate, setAnnualRate] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const slideAnim = useRef(new Animated.Value(0)).current;

  const assetTypes: AssetTypeOption[] = [
    {
      type: 'cash',
      icon: <PiggyBank size={32} color={Colors.accent.success[500]} />,
      title: '現金・預金',
      description: '銀行預金、現金、定期預金など',
      color: Colors.accent.success[50],
      examples: ['普通預金', '定期預金', '手持ち現金', '当座預金'],
    },
    {
      type: 'stock',
      icon: <TrendingUp size={32} color={Colors.accent.info[500]} />,
      title: '株式・投資',
      description: '個別株式、ETF、投資信託など',
      color: Colors.accent.info[50],
      examples: ['個別株式', 'ETF', '投資信託', 'REIT'],
    },
  ];

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const resetForm = () => {
    setSelectedType(null);
    setName('');
    setAmount('');
    setAnnualRate('');
    setMemo('');
    setErrors({});
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!selectedType) {
      newErrors.type = '資産の種類を選択してください';
    }

    if (!name.trim()) {
      newErrors.name = '資産名を入力してください';
    } else if (name.trim().length > 50) {
      newErrors.name = '資産名は50文字以内で入力してください';
    }

    const amountNum = parseAmountToNumber(amount);
    if (!amount.trim()) {
      newErrors.amount = '金額を入力してください';
    } else if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = '有効な金額を入力してください';
    } else if (amountNum > 999999999999) {
      newErrors.amount = '金額は999兆円以内で入力してください';
    }

    const rateNum = parseFloat(annualRate);
    if (!annualRate.trim()) {
      newErrors.annualRate = '年利を入力してください';
    } else if (isNaN(rateNum) || rateNum < 0) {
      newErrors.annualRate = '有効な年利を入力してください';
    } else if (rateNum > 100) {
      newErrors.annualRate = '年利は100%以内で入力してください';
    }

    if (memo.length > 200) {
      newErrors.memo = 'メモは200文字以内で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(
        selectedType!,
        name.trim(),
        parseAmountToNumber(amount),
        parseFloat(annualRate),
        memo.trim() || undefined
      );
      handleClose();
    } catch (error) {
      console.error('資産保存エラー:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (text: string) => {
    // 数字のみを抽出
    const numbers = text.replace(/[^\d]/g, '');
    if (!numbers) return '';

    // 3桁区切りでカンマを追加
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmount(text);
    setAmount(formatted);
  };

  const parseAmountToNumber = (amountText: string): number => {
    // カンマを除去してから数値変換
    const cleanAmount = amountText.replace(/,/g, '');
    return parseFloat(cleanAmount);
  };

  const getPlaceholderForType = (type: AssetType | null) => {
    if (!type) return '';
    return type === 'cash' ? 'みずほ銀行 普通預金' : 'トヨタ自動車 (7203)';
  };

  const getDefaultRateForType = (type: AssetType | null) => {
    if (!type) return '';
    return type === 'cash' ? '0.001' : '5';
  };

  const selectAssetType = (type: AssetType) => {
    setSelectedType(type);
    setAnnualRate(getDefaultRateForType(type));
    setErrors({});
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: slideAnim,
            },
          ]}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>新しい資産を追加</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color={Colors.semantic.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 資産種別選択 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>資産の種類</Text>
              <View style={styles.typeGrid}>
                {assetTypes.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.typeCard,
                      { backgroundColor: option.color },
                      selectedType === option.type && styles.typeCardSelected,
                    ]}
                    onPress={() => selectAssetType(option.type)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.typeIcon}>{option.icon}</View>
                    <Text style={styles.typeTitle}>{option.title}</Text>
                    <Text style={styles.typeDescription}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.type && (
                <Text style={styles.errorText}>{errors.type}</Text>
              )}
            </View>

            {selectedType && (
              <>
                {/* 資産名 */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>資産名</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.name && styles.inputError,
                    ]}
                  >
                    <Building2
                      size={20}
                      color={Colors.semantic.text.tertiary}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={getPlaceholderForType(selectedType)}
                      placeholderTextColor={Colors.semantic.text.tertiary}
                      value={name}
                      onChangeText={setName}
                      enablesReturnKeyAutomatically={false}
                      maxLength={50}
                    />
                  </View>
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}

                  {/* サンプル例 */}
                  <View style={styles.examplesContainer}>
                    <Text style={styles.examplesLabel}>例:</Text>
                    <View style={styles.exampleTags}>
                      {assetTypes
                        .find((t) => t.type === selectedType)
                        ?.examples.map((example) => (
                          <TouchableOpacity
                            key={example}
                            style={styles.exampleTag}
                            onPress={() => setName(example)}
                          >
                            <Text style={styles.exampleTagText}>{example}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                </View>

                {/* 金額と年利 */}
                <View style={styles.row}>
                  <View style={[styles.section, styles.halfWidth]}>
                    <Text style={styles.sectionTitle}>金額</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        errors.amount && styles.inputError,
                      ]}
                    >
                      <Text style={styles.currencySymbol}>¥</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="1,000,000"
                        placeholderTextColor={Colors.semantic.text.tertiary}
                        value={amount}
                        onChangeText={handleAmountChange}
                        keyboardType="numeric"
                        enablesReturnKeyAutomatically={false}
                      />
                    </View>
                    {errors.amount && (
                      <Text style={styles.errorText}>{errors.amount}</Text>
                    )}
                  </View>

                  <View style={[styles.section, styles.halfWidth]}>
                    <Text style={styles.sectionTitle}>年利</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        errors.annualRate && styles.inputError,
                      ]}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="5.0"
                        placeholderTextColor={Colors.semantic.text.tertiary}
                        value={annualRate}
                        onChangeText={setAnnualRate}
                        keyboardType="decimal-pad"
                        enablesReturnKeyAutomatically={false}
                      />
                      <Text style={styles.percentSymbol}>%</Text>
                    </View>
                    {errors.annualRate && (
                      <Text style={styles.errorText}>{errors.annualRate}</Text>
                    )}
                  </View>
                </View>

                {/* メモ */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>メモ（任意）</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      styles.memoContainer,
                      errors.memo && styles.inputError,
                    ]}
                  >
                    <TextInput
                      style={[styles.input, styles.memoInput]}
                      placeholder="給与振込口座、配当狙いなど..."
                      placeholderTextColor={Colors.semantic.text.tertiary}
                      value={memo}
                      onChangeText={setMemo}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      enablesReturnKeyAutomatically={false}
                      maxLength={200}
                    />
                  </View>
                  {errors.memo && (
                    <Text style={styles.errorText}>{errors.memo}</Text>
                  )}
                  <Text style={styles.characterCount}>{memo.length}/200</Text>
                </View>
              </>
            )}
          </ScrollView>

          {/* フッター */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedType || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedType || saving}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  (!selectedType || saving) && styles.saveButtonTextDisabled,
                ]}
              >
                {saving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: Colors.semantic.button.primary,
    backgroundColor: `${Colors.semantic.button.primary}08`,
  },
  typeIcon: {
    marginBottom: 12,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    gap: 12,
  },
  inputError: {
    borderColor: Colors.accent.error[500],
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.semantic.text.primary,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
  memoContainer: {
    alignItems: 'flex-start',
    minHeight: 80,
  },
  memoInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  examplesContainer: {
    marginTop: 8,
  },
  examplesLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 8,
  },
  exampleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleTag: {
    backgroundColor: Colors.semantic.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exampleTagText: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.accent.error[500],
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.semantic.button.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.semantic.border,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.surface,
  },
  saveButtonTextDisabled: {
    color: Colors.semantic.text.tertiary,
  },
});
