import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { translateErrorMessage } from '../../utils/errorTranslations';
import Toast from '../../components/Toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();

  // ユーザーがログインした場合、自動的にホーム画面に遷移
  React.useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading]);

  const showErrorToast = (message: string) => {
    setErrorMessage(message);
    setShowToast(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showErrorToast('メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      setLoading(false);
      showErrorToast(translateErrorMessage(error.message));
    } else {
      // ログイン成功時は、AuthContextのuserが更新されるまで待つ
      // router.replaceはAuthContextのonAuthStateChangeで自動的に処理される
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>ログイン</Text>
            <Text style={styles.subtitle}>
              アカウントにサインインしてください
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
                  placeholder="パスワードを入力"
                  placeholderTextColor={Colors.base.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.semantic.text.inverse}
                />
              ) : (
                <>
                  <Text style={styles.buttonText}>ログイン</Text>
                  <ArrowRight
                    size={18}
                    color={Colors.semantic.text.inverse}
                    style={styles.buttonIcon}
                  />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                アカウントをお持ちでない方は
              </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity style={styles.signupButton}>
                  <Text style={styles.signupLink}>新規登録</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <Toast
        message={errorMessage}
        type="error"
        visible={showToast}
        onHide={() => setShowToast(false)}
        duration={4000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 70% - ベース色の使用
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background, // 白背景
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
    color: Colors.semantic.text.primary, // プライマリテキスト
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.text.secondary, // セカンダリテキスト
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
    color: Colors.base.gray700,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface, // サーフェス色
    borderWidth: 1,
    borderColor: Colors.semantic.border, // ボーダー色
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
    color: Colors.semantic.text.primary,
  },

  // 25% - アクセント色の使用
  button: {
    backgroundColor: Colors.primary[500], // ブランドカラー
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
    color: Colors.semantic.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },

  // 70% - ベース色の使用
  divider: {
    height: 1,
    backgroundColor: Colors.semantic.border,
    marginVertical: 32,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 15,
    color: Colors.semantic.text.secondary,
    marginRight: 4,
  },
  signupButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  // 5% - 強調色の使用
  signupLink: {
    fontSize: 15,
    color: Colors.primary[600], // アクションリンク
    fontWeight: '600',
  },
});
