import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInAnonymously: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ wasAnonymous: boolean }>;
  deleteAccount: (password: string) => Promise<{ error: any }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('【AuthProvider】セッション取得エラー:', error);
        setLoading(false);
      });

    // Listen for auth changes
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const currentUser = user;
    const isAnonymous = currentUser?.is_anonymous === true;

    if (isAnonymous) {
      // 匿名ユーザーに認証情報を追加
      const { data, error } = await supabase.auth.updateUser({
        email: email,
        password: password,
      });
      return { data, error };
    } else {
      // 通常のサインアップ
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // 新規ユーザー作成時にプロフィールを自動作成
    if (!error && data.user) {
      try {
        await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          birth_date: '1990-01-01',
          onboarding_completed: false,
          name: null, // オンボーディングで入力されるまでnull
        });
      } catch (profileError) {
        console.error('プロフィール作成エラー:', profileError);
        // プロフィール作成に失敗してもユーザー作成は続行
      }
    }

      return { data, error };
    }
  };

  const signOut = async () => {
    // ログアウト前に user.is_anonymous をチェック
    const wasAnonymous = user?.is_anonymous === true;
    await supabase.auth.signOut();
    return { wasAnonymous };
  };

  const deleteAccount = async (password: string) => {
    try {
      if (!user?.email) {
        return { error: { message: 'ユーザー情報が見つかりません' } };
      }

      // パスワード再認証
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        return { error: { message: 'パスワードが正しくありません' } };
      }

      // ユーザーアカウント削除（RLSにより関連データも削除される）
      const { error: deleteError } = await supabase.auth.deleteUser();

      if (deleteError) {
        console.error('アカウント削除エラー:', deleteError);
        return { error: deleteError };
      }

      // ローカル状態をクリア
      setUser(null);
      setSession(null);

      return { error: null };
    } catch (error: any) {
      console.error('予期しないエラー:', error);
      return {
        error: { message: error.message || 'アカウント削除に失敗しました' },
      };
    }
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
        deleteAccount,
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
