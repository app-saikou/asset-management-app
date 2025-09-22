import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { User, LogOut, Trash2, AlertTriangle } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

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

  const handleDeleteAccount = async () => {
    try {
      if (!user?.id) {
        Alert.alert('エラー', 'ユーザー情報が見つかりません。');
        return;
      }

      // UID起点での完全削除を実行
      const { data, error } = await supabase.rpc(
        'delete_user_data_completely',
        {
          user_uuid: user.id,
        }
      );

      if (error) {
        console.error('データ削除エラー:', error);
        throw new Error(`データ削除に失敗しました: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'データ削除に失敗しました');
      }

      console.log('削除結果:', data);

      // クライアント側の認証状態をクリア
      await supabase.auth.signOut();

      // 削除成功
      Alert.alert(
        'アカウント削除完了',
        `アカウントと関連データが正常に削除されました。\n\n削除されたデータ:\n・合計: ${
          data.total_deleted
        }件\n・テーブル数: ${Object.keys(data.tables_affected).length}個`,
        [
          {
            text: 'OK',
            onPress: () => {
              setDeleteModalVisible(false);
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('アカウント削除エラー:', error);
      Alert.alert(
        'エラー',
        error.message || 'アカウントの削除に失敗しました。'
      );
    }
  };

  const showDeleteConfirmation = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    Alert.alert(
      '⚠️ 最終確認',
      'この操作は取り消せません。\n\n・すべてのデータが削除されます\n・アカウントは完全に消去されます\n・この操作は元に戻せません\n\n本当にアカウントを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ]
    );
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* プロフィールカード */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User size={32} color={Colors.semantic.button.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>ユーザー</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <View style={styles.logoutIconContainer}>
              <LogOut size={18} color={Colors.accent.error[600]} />
            </View>
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={showDeleteConfirmation}
          >
            <View style={styles.deleteIconContainer}>
              <Trash2 size={18} color={Colors.semantic.surface} />
            </View>
            <Text style={styles.deleteText}>アカウント削除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* アカウント削除確認モーダル */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={32} color={Colors.accent.error[600]} />
              </View>
              <Text style={styles.modalTitle}>アカウント削除</Text>
              <Text style={styles.modalSubtitle}>
                この操作は取り消すことができません
              </Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.warningText}>
                アカウントを削除すると以下のデータが完全に削除されます：
              </Text>
              <View style={styles.warningList}>
                <Text style={styles.warningListItem}>• すべての資産データ</Text>
                <Text style={styles.warningListItem}>• 計算履歴</Text>
                <Text style={styles.warningListItem}>• アカウント情報</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>削除する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.semantic.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // プロフィールカード
  profileCard: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
  },

  // アクションセクション
  actionSection: {
    gap: 16,
  },

  // ログアウトボタン
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.surface,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    shadowColor: Colors.semantic.text.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent.error[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    color: Colors.accent.error[600],
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },

  // アカウント削除ボタン
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent.error[500],
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    shadowColor: Colors.accent.error[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deleteText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.semantic.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent.error[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
  },
  modalBody: {
    padding: 24,
  },
  warningText: {
    fontSize: 16,
    color: Colors.semantic.text.primary,
    marginBottom: 16,
    fontWeight: '500',
  },
  warningList: {
    marginBottom: 0,
    paddingLeft: 8,
  },
  warningListItem: {
    fontSize: 14,
    color: Colors.accent.error[600],
    marginBottom: 8,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
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
    color: Colors.semantic.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: Colors.accent.error[600],
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: Colors.semantic.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
