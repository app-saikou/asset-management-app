import React from 'react';
import { Tabs } from 'expo-router';
import { Wallet, User, Calendar } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { BannerAdComponent } from '../../components/BannerAd';

export default function TabLayout() {
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
          name="index"
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
            title: '履歴',
            tabBarIcon: ({ size, color }) => (
              <Calendar size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'マイページ',
            tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>

      {/* フッター上部にバナー広告を表示 */}
      <BannerAdComponent />
    </>
  );
}
