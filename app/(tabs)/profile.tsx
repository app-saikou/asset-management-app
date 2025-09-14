import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { User, Mail, LogOut, Shield } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading]);

  const handleSignOut = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      {
        text: 'キャンセル',
        style: 'cancel',
      },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>プロフィール</Text>
          <Text style={styles.subtitle}>アカウント情報</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <User size={40} color={Colors.primary[500]} />
            </View>
            <Text style={styles.userName}>ユーザー</Text>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Mail
                size={20}
                color={Colors.base.gray500}
                style={styles.infoIcon}
              />
              <View>
                <Text style={styles.infoLabel}>メールアドレス</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Shield
                size={20}
                color={Colors.base.gray500}
                style={styles.infoIcon}
              />
              <View>
                <Text style={styles.infoLabel}>アカウント作成日</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.created_at).toLocaleDateString('ja-JP')}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LogOut
              size={20}
              color={Colors.accent.error[600]}
              style={styles.signOutIcon}
            />
            <Text style={styles.signOutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  infoIcon: {
    marginRight: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.error[50],
    borderRadius: 12,
    height: 52,
    marginBottom: 24,
  },
  signOutIcon: {
    marginRight: 12,
  },
  signOutText: {
    color: Colors.accent.error[600],
    fontSize: 16,
    fontWeight: '600',
  },
});
