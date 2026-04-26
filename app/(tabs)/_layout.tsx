import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Wallet, Settings, Calendar, Home } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { BannerAdComponent } from '../../components/BannerAd';
import InventoryButton from '../../components/InventoryButton';
import { useSubscription } from '../../hooks/useSubscription';
import { useBudget } from '../../hooks/useBudget';
import { isAdDisplayEnabled } from '../../lib/admob-config';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { checkInvalidBudgetPeriods } = useBudget();

  // 匿名ユーザーの場合はサインアップ画面にリダイレクト
  useEffect(() => {
    if (user?.is_anonymous === true) {
      router.replace('/auth/signup');
    }
  }, [user?.is_anonymous, router]);

  // 広告が表示される条件: Pro未加入 かつ 広告表示設定が有効
  const showAd = !isPro && isAdDisplayEnabled();

  const handleInventoryPress = async () => {
    // 予算期間のバリデーション（画面遷移前に実行）
    const { hasInvalid, invalidPeriods } = await checkInvalidBudgetPeriods();

    console.log('予算期間バリデーション結果:', {
      hasInvalid,
      invalidPeriods,
    });

    if (hasInvalid) {
      Alert.alert(
        '登録済み予算の設定が必要です',
        '予算設定画面で資産を再設定してください。',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: () => {
              // 予算設定画面を開く
              router.push('/budget');
            },
          },
        ]
      );
      return; // 画面遷移しない
    }

    // バリデーション通過した場合のみ画面遷移
    router.push('/inventory-step');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary[500],
          tabBarInactiveTintColor: Colors.base.gray400,
          tabBarStyle: {
            backgroundColor: Colors.semantic.background,
            borderTopColor: Colors.semantic.border,
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 34,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'ホーム',
            tabBarIcon: ({ size, color }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="assets"
          options={{
            title: '資産',
            tabBarIcon: ({ size, color }) => (
              <Wallet size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'タイムライン',
            tabBarIcon: ({ size, color }) => (
              <Calendar size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: '設定',
            tabBarIcon: ({ size, color }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* 全タブ共通のフッターボタン */}
      <View
        style={[
          styles.footerButtonContainer,
          showAd && styles.footerButtonContainerWithAd,
        ]}
      >
        <InventoryButton
          onPress={handleInventoryPress}
          disabled={false}
          loading={false}
        />
      </View>

      {/* フッター上部にバナー広告を表示 */}
      <BannerAdComponent />
    </>
  );
}

const styles = StyleSheet.create({
  footerButtonContainer: {
    position: 'absolute',
    bottom: 100, // タブバーの高さ（88px）
    right: 24,
    zIndex: 1000,
  },
  footerButtonContainerWithAd: {
    bottom: 160, // タブバー(88) + 広告領域(60)
  },
});
