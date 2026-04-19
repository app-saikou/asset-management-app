# 匿名ユーザーでのオンボーディング体験パターン

## 概要

このドキュメントでは、**匿名ユーザーでのオンボーディング体験 → サインアップで認証（本番ユーザーとして上書き）** の実装パターンを説明します。

このパターンにより、ユーザーはアカウント作成前にアプリの主要機能を体験でき、オンボーディング完了後にサインアップすることで、匿名ユーザーとして保存したデータが自動的に本番ユーザーに引き継がれます。

## メリット

- **低い参入障壁**: ユーザーはアカウント作成前にアプリを体験できる
- **データの自動引き継ぎ**: 匿名ユーザーとして保存したデータが、サインアップ時に自動的に本番ユーザーに引き継がれる
- **シームレスな体験**: ユーザー ID が変わらないため、データマージが不要
- **柔軟なログアウト処理**: 匿名ユーザーと本番ユーザーで異なる遷移先を設定可能

## アーキテクチャ

### 認証フロー

```
1. 初回起動
   ↓
2. ウェルカム画面
   ↓
3. 「はじめる」ボタン押下
   ↓
4. 匿名ユーザー作成 (signInAnonymously)
   ↓
5. オンボーディング体験（データは匿名ユーザーのuser_idで保存）
   ↓
6. オンボーディング完了
   ↓
7. サインアップ画面
   ↓
8. サインアップ実行 (updateUser)
   ↓
9. 匿名ユーザー → 本番ユーザーに変換（user_idは同じ）
   ↓
10. ホーム画面（データは自動的に引き継がれる）
```

### データの流れ

```
匿名ユーザー作成時:
- user_id: "abc-123" (匿名)
- user_profiles.user_id: "abc-123"
- multiple_assets.user_id: "abc-123"
- asset_history.user_id: "abc-123"
- ... (すべて "abc-123" で保存)

サインアップ時:
- user_id: "abc-123" (本番ユーザーに変換、IDは同じ)
- user_profiles.user_id: "abc-123" (既存データ)
- multiple_assets.user_id: "abc-123" (既存データ)
- asset_history.user_id: "abc-123" (既存データ)
- ... (すべて自動的に引き継がれる)
```

## 実装

### 1. 認証コンテキストの実装

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ data: any; error: any }>;
  signInAnonymously: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ wasAnonymous: boolean }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 既存セッションの取得
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('セッション取得エラー:', error);
        setLoading(false);
      });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 匿名ユーザーとしてサインイン
  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    return { data, error };
  };

  // サインアップ（匿名ユーザーの場合は変換、通常の場合は新規作成）
  const signUp = async (email: string, password: string) => {
    const currentUser = user;
    const isAnonymous = currentUser?.is_anonymous === true;

    if (isAnonymous) {
      // 匿名ユーザーに認証情報を追加（user_idは変わらない）
      const { data, error } = await supabase.auth.updateUser({
        email: email,
        password: password,
      });
      return { data, error };
    } else {
      // 通常のサインアップ（新規ユーザー作成）
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      // 新規ユーザー作成時にプロフィールを自動作成
      if (!error && data.user) {
        try {
          await supabase.from('user_profiles').insert({
            user_id: data.user.id,
            // デフォルト値を設定
            onboarding_completed: false,
          });
        } catch (profileError) {
          console.error('プロフィール作成エラー:', profileError);
        }
      }

      return { data, error };
    }
  };

  // ログアウト（匿名ユーザーかどうかを判定して返す）
  const signOut = async () => {
    // ログアウト前に user.is_anonymous をチェック
    const wasAnonymous = user?.is_anonymous === true;
    await supabase.auth.signOut();
    return { wasAnonymous };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInAnonymously,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2. ウェルカム画面での匿名ユーザー作成

```typescript
// components/onboarding/OnboardingWelcome.tsx
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from 'react-native';

export default function OnboardingWelcome({ onStart }: { onStart: () => void }) {
  const { user, signInAnonymously } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    // ユーザーが存在しない場合、匿名ユーザーを作成
    if (!user) {
      setIsLoading(true);
      try {
        const { error } = await signInAnonymously();
        if (error) {
          console.error('匿名ユーザー作成エラー:', error);
          Alert.alert(
            'エラー',
            'オンボーディングを開始できませんでした。もう一度お試しください。'
          );
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('匿名ユーザー作成エラー:', err);
        Alert.alert(
          'エラー',
          'オンボーディングを開始できませんでした。もう一度お試しください。'
        );
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }
    onStart();
  };

  return (
    // UI実装
  );
}
```

### 3. オンボーディング完了処理

```typescript
// hooks/useOnboarding.ts
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export function useOnboarding() {
  const { user } = useAuth();

  const completeOnboarding =
    useCallback(async (): Promise<OnboardingResult> => {
      if (!user?.id) {
        return {
          success: false,
          message: 'ユーザー情報が不足しています',
        };
      }

      try {
        // オンボーディングデータを保存（匿名ユーザーのuser_idで保存）
        // 例: プロフィール、資産データ、設定など

        await supabase.from('user_profiles').upsert({
          user_id: user.id, // 匿名ユーザーのID
          name: onboardingData.name,
          birth_date: onboardingData.birthDate,
          onboarding_completed: true,
        });

        await supabase.from('multiple_assets').insert({
          user_id: user.id, // 匿名ユーザーのID
          // ... 資産データ
        });

        // その他のデータも同様に user.id で保存

        return { success: true };
      } catch (error: any) {
        console.error('オンボーディング完了エラー:', error);
        return {
          success: false,
          message: error.message || 'オンボーディングの完了に失敗しました',
        };
      }
    }, [user?.id]);

  return { completeOnboarding };
}
```

### 4. サインアップ画面での遷移処理

```typescript
// app/auth/signup.tsx
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useLocalSearchParams, router } from 'expo-router';

export default function SignupScreen() {
  const params = useLocalSearchParams();
  const isFromOnboarding = params.fromOnboarding === 'true';
  const { signUp, user, loading: authLoading } = useAuth();
  const { isNewUser } = useOnboarding();

  // ユーザーがサインアップ完了した場合の遷移処理
  React.useEffect(() => {
    if (!authLoading && user && !user.is_anonymous) {
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
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, authLoading, isNewUser, isFromOnboarding]);

  const handleSignUp = async (email: string, password: string) => {
    const { error } = await signUp(email, password);
    if (error) {
      // エラーハンドリング
    }
    // 成功時は useEffect で遷移処理が実行される
  };

  return (
    // UI実装
  );
}
```

### 5. ログアウト処理での遷移先判定

```typescript
// app/(tabs)/profile.tsx
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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
          const { wasAnonymous } = await signOut();
          // 匿名ユーザーがログアウトした場合はウェルカム画面、本番ユーザーがログアウトした場合はログイン画面に遷移
          if (wasAnonymous) {
            router.replace('/onboarding');
          } else {
            router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  return (
    // UI実装
  );
}
```

### 6. ルーティング処理

```typescript
// app/index.tsx
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { router } from 'expo-router';

export default function Index() {
  const { user, loading } = useAuth();
  const { isNewUser, profileLoading } = useOnboarding();

  useEffect(() => {
    if (!loading && !profileLoading) {
      if (user) {
        const isAnonymous = user.is_anonymous === true;
        const isNewUserResult = isNewUser();

        if (isAnonymous) {
          // 匿名ユーザーの場合
          if (isNewUserResult) {
            // オンボーディング未完了 → オンボーディング画面
            router.replace('/onboarding');
          } else {
            // オンボーディング完了 → サインアップ画面
            router.replace('/auth/signup');
          }
        } else if (isNewUserResult) {
          // 通常ユーザーでオンボーディング未完了
          router.replace('/onboarding');
        } else {
          // 通常ユーザーでオンボーディング完了
          router.replace('/(tabs)');
        }
      } else {
        // 初回起動時はウェルカム画面に遷移
        router.replace('/onboarding');
      }
    }
  }, [user?.id, loading, profileLoading]);

  return <LoadingScreen />;
}
```

## データベース設計

### 重要なポイント

1. **すべてのテーブルで `user_id` を外部キーとして使用**

   - 匿名ユーザーと本番ユーザーで同じ `user_id` を使用するため、データの引き継ぎが自動的

2. **RLS (Row Level Security) の設定**
   - `auth.uid() = user_id` でアクセス制御
   - 匿名ユーザーも本番ユーザーも同じ `user_id` でアクセス可能

### テーブル設計例

```sql
-- ユーザープロフィールテーブル
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  birth_date DATE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- その他のテーブルも同様に user_id で関連付け
CREATE TABLE multiple_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... その他のカラム
);

-- RLS設定
ALTER TABLE multiple_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON multiple_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets" ON multiple_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## フローチャート

```
┌─────────────────┐
│  初回起動       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ウェルカム画面 │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  signInAnonymously()    │
│  (匿名ユーザー作成)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  オンボーディング│
│  (データ保存)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  オンボーディング│
│  完了            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  サインアップ画面│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  updateUser()           │
│  (匿名→本番ユーザー変換) │
│  user_idは同じ          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  ホーム画面     │
│  (データ自動引き継ぎ) │
└─────────────────┘
```

## 重要なポイント

### 1. `updateUser` の使用

Supabase の `updateUser` を使用することで、匿名ユーザーに認証情報（email, password）を追加できます。この時、`user_id` は変わりません。

```typescript
// 匿名ユーザーに認証情報を追加
const { data, error } = await supabase.auth.updateUser({
  email: email,
  password: password,
});
// user_id は変わらないため、既存のデータが自動的に引き継がれる
```

### 2. データの自動引き継ぎ

すべてのデータが `user_id` で関連付けられているため、`user_id` が変わらない限り、データは自動的に引き継がれます。特別なマージ処理は不要です。

### 3. ログアウト時の遷移先判定

ログアウト時に `user.is_anonymous` をチェックすることで、匿名ユーザーと本番ユーザーで異なる遷移先を設定できます。

```typescript
const signOut = async () => {
  const wasAnonymous = user?.is_anonymous === true;
  await supabase.auth.signOut();
  return { wasAnonymous };
};
```

### 4. オンボーディング完了フラグ

`onboarding_completed` フラグを使用して、オンボーディング完了状態を管理します。

```typescript
const isNewUser = useCallback(() => {
  if (!user?.id) return false;
  return !profile || profile.onboarding_completed === false;
}, [user?.id, profile]);
```

## 注意点・ベストプラクティス

### 1. 匿名ユーザーのアクセス制限

匿名ユーザーはホーム画面にアクセスできないようにする必要があります。

```typescript
// app/(tabs)/index.tsx
useEffect(() => {
  if (user?.is_anonymous === true) {
    router.replace('/auth/signup');
  }
}, [user?.is_anonymous, router]);
```

### 2. エラーハンドリング

匿名ユーザー作成やサインアップ時のエラーを適切に処理します。

```typescript
const { error } = await signInAnonymously();
if (error) {
  Alert.alert('エラー', 'オンボーディングを開始できませんでした。');
  return;
}
```

### 3. ローディング状態の管理

認証状態の読み込み中は適切なローディング画面を表示します。

```typescript
if (loading || profileLoading) {
  return <LoadingScreen />;
}
```

### 4. データの整合性

オンボーディング完了時に、すべてのデータが正しく保存されていることを確認します。

```typescript
const completeOnboarding = async () => {
  try {
    // トランザクション的にデータを保存
    await updateProfile({ ... });
    await addAsset({ ... });
    // ...
  } catch (error) {
    // エラーハンドリング
  }
};
```

## トラブルシューティング

### 問題 1: サインアップ後にデータが引き継がれない

**原因**: `user_id` が変わっている可能性があります。

**解決策**: `updateUser` を使用していることを確認してください。`signUp` ではなく `updateUser` を使用することで、`user_id` が維持されます。

### 問題 2: 匿名ユーザーがホーム画面にアクセスできる

**原因**: ルーティング処理で匿名ユーザーのチェックが不足しています。

**解決策**: ホーム画面やタブ画面で匿名ユーザーのリダイレクト処理を追加してください。

### 問題 3: ログアウト後の遷移先が正しくない

**原因**: `signOut` 関数で `wasAnonymous` を返していない可能性があります。

**解決策**: `signOut` 関数でログアウト前に `user.is_anonymous` をチェックし、戻り値として返してください。

## まとめ

このパターンにより、ユーザーはアカウント作成前にアプリを体験でき、サインアップ時にデータが自動的に引き継がれます。実装のポイントは以下の通りです：

1. **匿名ユーザー作成**: `signInAnonymously()` を使用
2. **データ保存**: すべてのデータを `user_id` で関連付け
3. **サインアップ**: `updateUser()` を使用して匿名ユーザーを本番ユーザーに変換
4. **ログアウト処理**: `user.is_anonymous` をチェックして遷移先を決定

このパターンは、ユーザー体験を向上させ、参入障壁を下げる効果的な方法です。
