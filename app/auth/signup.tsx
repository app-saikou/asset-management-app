import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useAgeBasedCalculation';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Mail, Lock } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { translateErrorMessage } from '../../utils/errorTranslations';
import Toast from '../../components/Toast';

export default function SignupScreen() {
  const params = useLocalSearchParams();
  const isFromOnboarding = params.fromOnboarding === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const { signUp, user, loading: authLoading } = useAuth();
  const { isLoading: profileLoading } = useUserProfile();
  const { isNewUser } = useOnboarding();

  // ユーザーがサインアップ完了した場合の遷移処理
  React.useEffect(() => {
    if (!authLoading && !profileLoading && user && !user.is_anonymous) {
      // 匿名ユーザーから通常ユーザーに変換された場合、または通常ユーザーの新規作成の場合
      if (isNewUser()) {
        // オンボーディング未完了 → オンボーディング画面
        router.replace('/onboarding');
      } else {
        // オンボーディング完了 → ホーム画面
        // オンボーディング完了画面から来た場合は通知許可モーダルを表示
        if (isFromOnboarding) {
          router.replace('/(tabs)?showNotificationModal=true');
        } else {
          router.replace('/(tabs)/home');
        }
      }
    }
  }, [user, authLoading, profileLoading, isNewUser, isFromOnboarding]);

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      showToastMessage('全てのフィールドを入力してください', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToastMessage('パスワードが一致しません', 'error');
      return;
    }

    if (password.length < 6) {
      showToastMessage('パスワードは6文字以上で入力してください', 'error');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);

    if (error) {
      setLoading(false);
      showToastMessage(translateErrorMessage(error.message), 'error');
    } else {
      setLoading(false);
      showToastMessage(
        user?.is_anonymous === true
          ? 'アカウント登録が完了しました'
          : 'アカウントが作成されました',
        'success'
      );

      // AuthContextのuserが更新されるまで待つ
      // router.replaceはuseEffectで自動的に処理される
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>アカウント作成</Text>
            <Text style={styles.subtitle}>
              {user?.is_anonymous === true
                ? 'メールアドレスとパスワードを設定して\nアカウントを登録しましょう'
                : '新しいアカウントを作成してください'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メールアドレス</Text>
              <View style={styles.inputContainer}>
                <Mail
                  size={18}
                  color={Colors.base.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor={Colors.base.gray400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>パスワード</Text>
              <View style={styles.inputContainer}>
                <Lock
                  size={18}
                  color={Colors.base.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="6文字以上のパスワード"
                  placeholderTextColor={Colors.base.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>パスワード確認</Text>
              <View style={styles.inputContainer}>
                <Lock
                  size={18}
                  color={Colors.base.gray500}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="パスワードを再入力"
                  placeholderTextColor={Colors.base.gray400}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>アカウント作成</Text>
              )}
            </TouchableOpacity>

            {/* オンボーディング完了画面から来た場合はログインリンクを非表示 */}
            {!isFromOnboarding && (
              <>
                <View style={styles.divider} />

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>
                    既にアカウントをお持ちの方は
                  </Text>
                  <Link href="/auth/login" asChild>
                    <TouchableOpacity style={styles.loginButton}>
                      <Text style={styles.loginLink}>ログイン</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={4000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 32,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 4,
  },
  loginButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  loginLink: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
});
