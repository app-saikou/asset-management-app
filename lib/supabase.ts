import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://ogaaujbbcbkgsddzntte.supabase.co';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYWF1amJiY2JrZ3NkZHpudHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MTYwMjcsImV4cCI6MjA3MzI5MjAyN30.YOUBNQB-lQk2iOdJr-MU8NAKOmflfSgYz7ZnR3BePG8';

// 環境変数の検証
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません');
}

// 安全なSupabaseクライアント作成
let supabase: any = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('Supabaseクライアントの作成に失敗しました:', error);
  // フォールバック用のダミークライアント
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase接続エラー' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase接続エラー' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Supabase接続エラー' } }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase接続エラー' } }),
      }),
    }),
  };
}

export { supabase };
