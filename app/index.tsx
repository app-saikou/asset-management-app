import React, { useEffect, useState, useRef } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

export default function Index() {
  const { user, loading } = useAuth();
  const { isNewUser, profileLoading } = useOnboarding();
  const [isChecking, setIsChecking] = useState(true);
  const hasNavigatedRef = useRef(false); // 多重遷移ガード

  // 一時的にオンボーディングをスキップするフラグ（開発用）
  const SKIP_ONBOARDING = false; // falseにすると通常の動作に戻る

  useEffect(() => {
    if (!loading && !profileLoading) {
      setIsChecking(false);
    }
  }, [loading, profileLoading]);

  useEffect(() => {
    // 多重遷移ガード: 既に遷移済みの場合は実行しない
    if (hasNavigatedRef.current) {
      return;
    }

    if (!loading && !profileLoading && !isChecking) {
      try {
        if (user) {
          // 匿名ユーザーかどうかをチェック
          const isAnonymous = user.is_anonymous === true;
          // isNewUser()を一度だけ評価してローカル変数に固定
          const isNewUserResult = !SKIP_ONBOARDING && isNewUser();

          if (SKIP_ONBOARDING) {
            hasNavigatedRef.current = true;
            router.replace('/(tabs)/home');
          } else if (isAnonymous) {
            // 匿名ユーザーの場合
            if (isNewUserResult) {
              // オンボーディング未完了 → オンボーディング画面
              hasNavigatedRef.current = true;
              router.replace('/onboarding');
            } else {
              // オンボーディング完了 → サインアップ画面
              hasNavigatedRef.current = true;
              router.replace('/auth/signup');
            }
          } else if (isNewUserResult) {
            // 通常ユーザーでオンボーディング未完了
            hasNavigatedRef.current = true;
            router.replace('/onboarding');
          } else {
            // 通常ユーザーでオンボーディング完了
            hasNavigatedRef.current = true;
            router.replace('/(tabs)/home');
          }
        } else {
          // 初回起動時はオンボーディング画面に遷移
          // オンボーディング画面で「はじめる」ボタンを押すと匿名ユーザーが作成される
          hasNavigatedRef.current = true;
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('【Index】ルーティングエラー:', error);
      }
    }
    // 依存配列からprofile（オブジェクト）を除外し、user?.idのみに依存
    // profileはオブジェクトなので、参照が変わるたびに再評価されることを防ぐ
  }, [user?.id, loading, profileLoading, isChecking]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={styles.text}>読み込み中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.semantic.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
});
