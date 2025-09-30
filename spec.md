# Polaris - 資産管理アプリ 詳細仕様書

## 📋 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [アーキテクチャ](#3-アーキテクチャ)
4. [データベース設計](#4-データベース設計)
5. [機能仕様](#5-機能仕様)
6. [UI/UX 設計](#6-uiux設計)
7. [広告システム](#7-広告システム)
8. [認証・セキュリティ](#8-認証セキュリティ)
9. [パフォーマンス](#9-パフォーマンス)
10. [開発・デプロイ](#10-開発デプロイ)
11. [今後の拡張計画](#11-今後の拡張計画)

---

## 1. プロジェクト概要

### 1.1 アプリケーション名

**Polaris（ポラリス）** - あなたのお金の羅針盤

### 1.2 バージョン情報

- **現在のバージョン**: 1.0.0
- **ビルド番号**: 1 (iOS), 1 (Android)
- **リリース日**: 2024 年 1 月

### 1.3 アプリケーション概要

Polaris は、個人の資産管理と将来価値予測に特化したモバイルアプリケーションです。複数の資産タイプ（現金、株式）を統合管理し、複利計算による 10 年後の資産価値を予測します。直感的な UI とリアルタイム計算により、投資戦略の立案をサポートします。

### 1.4 ターゲットユーザー

- 個人投資家
- 資産管理に興味のある一般ユーザー
- 将来の資産形成を計画するユーザー
- 複数の資産を統合管理したいユーザー

### 1.5 主要機能

1. **マルチアセット管理**: 現金・株式の統合管理
2. **複利計算エンジン**: 個別年利率による将来価値予測
3. **棚卸し機能**: 資産調整とリアルタイム計算
4. **履歴管理**: 計算結果の時系列保存
5. **広告収益化**: バナー・インタースティシャル広告

---

## 2. 技術スタック

### 2.1 フロントエンド

- **React Native**: 0.81.4
- **Expo SDK**: 54.0.0
- **TypeScript**: 5.9.2
- **Expo Router**: 6.0.6 (ファイルベースルーティング)

### 2.2 状態管理・データフロー

- **React Hooks**: useState, useEffect, useCallback
- **Context API**: AuthContext (認証状態管理)
- **Custom Hooks**: 機能別データ管理

### 2.3 バックエンド・データベース

- **Supabase**: PostgreSQL + リアルタイム機能
- **Row Level Security (RLS)**: ユーザー別データ分離
- **ストアドプロシージャ**: 複雑な削除処理

### 2.4 認証・セキュリティ

- **Supabase Auth**: メール認証
- **AsyncStorage**: セッション永続化
- **RLS ポリシー**: データアクセス制御

### 2.5 広告・収益化

- **Google Mobile Ads**: 15.7.0
- **AdMob**: バナー・インタースティシャル広告
- **ATT (App Tracking Transparency)**: iOS プライバシー対応

### 2.6 開発ツール・ライブラリ

- **Lucide React Native**: アイコンライブラリ
- **React Native Safe Area Context**: セーフエリア対応
- **React Native Reanimated**: アニメーション
- **React Native Gesture Handler**: ジェスチャー処理

### 2.7 ビルド・デプロイ

- **Expo Application Services (EAS)**: ビルド・配信
- **Metro Bundler**: JavaScript バンドリング
- **TypeScript**: 型安全性確保

---

## 3. アーキテクチャ

### 3.1 アプリケーション構造

```
app/
├── _layout.tsx              # ルートレイアウト
├── (tabs)/                  # タブナビゲーション
│   ├── _layout.tsx         # タブレイアウト
│   ├── index.tsx           # 資産画面
│   ├── history.tsx         # 履歴画面
│   └── profile.tsx         # プロフィール画面
├── auth/                   # 認証フロー
│   ├── _layout.tsx
│   ├── login.tsx
│   └── signup.tsx
└── history-detail.tsx      # 履歴詳細画面
```

### 3.2 コンポーネント設計

```
components/
├── AdBanner.tsx            # バナー広告
├── AdInterstitial.tsx      # インタースティシャル広告
├── AddAssetModal.tsx       # 資産追加モーダル
├── AssetCard.tsx           # 資産カード
├── AssetSectionCard.tsx    # 資産セクション
├── FloatingActionButton.tsx # FAB
├── InventoryAdjustmentModal.tsx # 棚卸し調整モーダル
├── InventoryButton.tsx     # 棚卸しボタン
├── TotalAssetCard.tsx      # 総資産カード
└── Toast.tsx               # トースト通知
```

### 3.3 カスタムフック

```
hooks/
├── useAuth.ts              # 認証管理
├── useAssets.ts            # 資産データ管理
├── useMultipleAssets.tsx   # マルチアセット管理
├── useAssetHistory.ts      # 履歴管理
├── useSubscription.ts      # サブスクリプション
└── useFrameworkReady.ts    # フレームワーク初期化
```

### 3.4 データフロー

1. **認証フロー**: AuthContext → ユーザー状態管理
2. **資産データ**: useMultipleAssets → Supabase → リアルタイム更新
3. **履歴データ**: useAssetHistory → 時系列データ管理
4. **広告システム**: AdMob → 収益化

### 3.5 状態管理パターン

- **ローカル状態**: useState (UI 状態)
- **グローバル状態**: Context API (認証)
- **サーバー状態**: Custom Hooks + Supabase
- **永続化**: AsyncStorage (セッション)

---

## 4. データベース設計

### 4.1 テーブル構成

#### 4.1.1 multiple_assets テーブル

```sql
CREATE TABLE multiple_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'stock')),
  name VARCHAR(100) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  annual_rate DECIMAL(5,2) NOT NULL CHECK (annual_rate >= 0 AND annual_rate <= 100),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.2 asset_history テーブル

```sql
CREATE TABLE asset_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_assets BIGINT NOT NULL,
  annual_rate DECIMAL(5,2) NOT NULL,
  years INTEGER NOT NULL,
  future_value BIGINT NOT NULL,
  increase_amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.3 asset_history_details テーブル

```sql
CREATE TABLE asset_history_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  history_id UUID REFERENCES asset_history(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL,
  asset_name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL,
  original_amount BIGINT NOT NULL,
  adjusted_amount BIGINT NOT NULL,
  annual_rate DECIMAL(5,2) NOT NULL
);
```

### 4.2 インデックス設計

```sql
-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_multiple_assets_user_id ON multiple_assets(user_id);
CREATE INDEX idx_multiple_assets_type ON multiple_assets(type);
CREATE INDEX idx_multiple_assets_updated_at ON multiple_assets(updated_at);

CREATE INDEX idx_asset_history_user_id ON asset_history(user_id);
CREATE INDEX idx_asset_history_created_at ON asset_history(created_at);

CREATE INDEX idx_asset_history_details_history_id ON asset_history_details(history_id);
```

### 4.3 Row Level Security (RLS)

```sql
-- ユーザーは自分のデータのみアクセス可能
ALTER TABLE multiple_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_history_details ENABLE ROW LEVEL SECURITY;

-- ポリシー例
CREATE POLICY "Users can view their own assets" ON multiple_assets
  FOR SELECT USING (auth.uid() = user_id);
```

### 4.4 ストアドプロシージャ

```sql
-- UID起点での完全データ削除
CREATE OR REPLACE FUNCTION delete_user_data_completely(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_deleted INTEGER := 0;
  tables_affected JSON := '{}';
BEGIN
  -- 各テーブルからデータを削除
  -- 戻り値: 削除件数と影響テーブル情報
  RETURN json_build_object(
    'success', true,
    'total_deleted', total_deleted,
    'tables_affected', tables_affected
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. 機能仕様

### 5.1 認証システム

#### 5.1.1 ログイン機能

- **認証方式**: メールアドレス + パスワード
- **バリデーション**: リアルタイム入力検証
- **エラーハンドリング**: トースト通知によるユーザーフレンドリーなエラー表示
- **セッション管理**: AsyncStorage による自動ログイン

#### 5.1.2 サインアップ機能

- **新規登録**: メールアドレス + パスワード
- **確認メール**: Supabase Auth による自動送信
- **バリデーション**: パスワード強度チェック

#### 5.1.3 ログアウト機能

- **確認ダイアログ**: 誤操作防止
- **セッションクリア**: ローカルストレージ削除
- **画面遷移**: ログイン画面への自動リダイレクト

#### 5.1.4 アカウント削除機能

- **多段階確認**: モーダル → アラート → 実行
- **完全削除**: UID 起点での全データ削除
- **ストアドプロシージャ**: トランザクション保証

### 5.2 資産管理システム

#### 5.2.1 マルチアセット登録

- **対応資産タイプ**: 現金 (cash), 株式 (stock)
- **必須項目**: 名前, 金額, 年利率
- **オプション項目**: メモ
- **バリデーション**:
  - 金額: 0 以上, 整数のみ
  - 年利率: 0-100% (小数点 2 桁)
  - 名前: 最大 100 文字

#### 5.2.2 資産表示・編集

- **カテゴリ別表示**: 現金・株式セクション分離
- **金額順ソート**: 各カテゴリ内で降順表示
- **リアルタイム更新**: 追加・編集・削除時の即座反映
- **編集機能**: 開発中（将来実装予定）
- **削除機能**: 確認ダイアログ付き

#### 5.2.3 総資産計算

- **リアルタイム集計**: 全資産の合計金額
- **カテゴリ別集計**: 現金・株式の個別合計
- **数値フォーマット**: 日本語ロケール対応 (1,000,000 円)

### 5.3 棚卸し計算システム

#### 5.3.1 複利計算エンジン

- **計算式**: `future_value = current_assets * (1 + annual_rate / 100) ^ years`
- **計算期間**: 固定 10 年
- **年利率**: 加重平均年利率（資産額に応じた重み付け）
- **精度**: 整数値（小数点以下切り捨て）

#### 5.3.2 資産調整機能

- **調整モーダル**: 各資産の金額を個別調整
- **リアルタイム計算**: 入力に応じた将来価値再計算
- **差額表示**: 調整前後の差分（絶対値・パーセンテージ）
- **制約条件**:
  - 負の値は入力不可
  - 整数のみ
  - 上限なし

#### 5.3.3 履歴保存

- **計算結果保存**: 調整後の値を履歴テーブルに保存
- **資産詳細保存**: 各資産の調整内容を詳細テーブルに保存
- **タイムスタンプ**: 計算実行時刻を記録

### 5.4 履歴管理システム

#### 5.4.1 履歴表示

- **月別グループ化**: 作成日時による月単位でのグループ表示
- **展開・折りたたみ**: 各グループの表示切り替え
- **時系列ソート**: 最新順での表示
- **件数表示**: 各グループの計算回数表示

#### 5.4.2 履歴詳細

- **詳細画面**: 個別計算結果の詳細表示
- **資産別変更**: 各資産の調整内容表示
- **計算パラメータ**: 年利率, 期間, 増加額の表示
- **ナビゲーション**: 履歴一覧への戻りボタン

#### 5.4.3 データ更新

- **フォーカス更新**: 画面表示時の自動データ再取得
- **リアルタイム同期**: Supabase のリアルタイム機能（将来実装予定）
- **エラーハンドリング**: ネットワークエラー時の適切な表示

### 5.5 プロフィール管理

#### 5.5.1 ユーザー情報表示

- **基本情報**: メールアドレス表示
- **アバター**: デフォルトアイコン（将来カスタマイズ予定）
- **アカウント状態**: アクティブ状態の表示

#### 5.5.2 アカウント操作

- **ログアウト**: 確認ダイアログ付きログアウト
- **アカウント削除**: 多段階確認による完全削除
- **データ削除**: 関連データの完全削除（ストアドプロシージャ使用）

---

## 6. UI/UX 設計

### 6.1 デザインシステム

#### 6.1.1 カラーパレット

```typescript
// 70:25:5 ルールに基づくカラー設計
export const Colors = {
  // ベース色 (70%) - 背景、テキスト、境界線
  base: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    // ... グレースケール
  },

  // アクセント色 (25%) - ブランドカラー
  primary: {
    500: '#0EA5E9', // メインブランドカラー
    // ... ブルースケール
  },

  // 強調色 (5%) - CTA、エラー、成功
  accent: {
    success: { 500: '#22C55E' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
    info: { 500: '#3B82F6' },
  },
};
```

#### 6.1.2 タイポグラフィ

- **フォントサイズ**: 10px - 24px (段階的スケール)
- **フォントウェイト**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **行間**: 1.2 - 1.5 (コンテンツに応じて調整)

#### 6.1.3 スペーシング

- **基本単位**: 4px (4, 8, 12, 16, 20, 24, 32, 40, 48px)
- **コンテナパディング**: 20px - 24px
- **コンポーネント間隔**: 16px - 24px

### 6.2 コンポーネント設計

#### 6.2.1 カードコンポーネント

```typescript
// 統一されたカードデザイン
const cardStyles = {
  backgroundColor: Colors.semantic.surface,
  borderRadius: 12,
  padding: 20,
  borderWidth: 1,
  borderColor: Colors.semantic.border,
  shadowColor: Colors.semantic.text.primary,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
};
```

#### 6.2.2 ボタンデザイン

- **プライマリボタン**: ブランドカラー背景 + 白文字
- **セカンダリボタン**: グレー背景 + ダークテキスト
- **危険ボタン**: 赤背景 + 白文字
- **サイズ**: 48px - 52px (タッチしやすい高さ)

#### 6.2.3 モーダルデザイン

- **オーバーレイ**: 半透明黒背景
- **コンテンツ**: 角丸 + シャドウ
- **アニメーション**: フェードイン/アウト
- **レスポンシブ**: 画面サイズに応じた調整

### 6.3 ナビゲーション設計

#### 6.3.1 タブナビゲーション

- **タブ数**: 3 つ（資産、履歴、マイページ）
- **アイコン**: Lucide React Native
- **アクティブ状態**: ブランドカラー
- **インアクティブ状態**: グレー
- **ラベル**: 日本語表記

#### 6.3.2 画面遷移

- **スタックナビゲーション**: Expo Router
- **ヘッダー**: 非表示（カスタムヘッダー使用）
- **戻るボタン**: 必要に応じて表示

### 6.4 レスポンシブデザイン

#### 6.4.1 画面サイズ対応

- **iPhone SE**: 最小サイズ対応
- **iPhone 14 Pro Max**: 最大サイズ対応
- **Safe Area**: ノッチ・ホームインジケーター対応

#### 6.4.2 向き対応

- **ポートレート**: メイン表示方向
- **ランドスケープ**: 制限あり（将来対応予定）

### 6.5 アクセシビリティ

#### 6.5.1 タッチターゲット

- **最小サイズ**: 44px × 44px (Apple HIG 準拠)
- **推奨サイズ**: 48px × 48px 以上
- **間隔**: タッチターゲット間 8px 以上

#### 6.5.2 視覚的フィードバック

- **アクティブ状態**: タップ時の色変化
- **ローディング状態**: スピナー表示
- **エラー状態**: 赤色でのエラー表示
- **成功状態**: 緑色での成功表示

---

## 7. 広告システム

### 7.1 広告プラットフォーム

#### 7.1.1 Google Mobile Ads

- **SDK バージョン**: 15.7.0
- **プラットフォーム**: iOS, Android
- **広告タイプ**: バナー広告, インタースティシャル広告

#### 7.1.2 広告ユニット ID

```typescript
// テスト用ID（本番環境では実際のIDに変更）
export const AD_UNIT_IDS = {
  banner: {
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  },
  interstitial: {
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  },
};
```

### 7.2 バナー広告

#### 7.2.1 表示仕様

- **サイズ**: Adaptive Banner (画面幅に応じて自動調整)
- **位置**: フッター上（全画面固定）
- **更新頻度**: 30 秒間隔での自動更新
- **表示条件**: 無料ユーザーのみ

#### 7.2.2 実装詳細

```typescript
// バナー広告コンポーネント
export const BannerAdComponent = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // 30秒間隔で自動更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BannerAd
      key={refreshKey}
      unitId={adUnitId}
      size={BannerAdSize.ADAPTIVE_BANNER}
    />
  );
};
```

#### 7.2.3 レイアウト調整

- **z-index**: 1000 (フッターより上)
- **bottom**: 88px (フッター高さ分)
- **幅**: 画面全幅
- **背景**: アプリ背景色と統一

### 7.3 インタースティシャル広告

#### 7.3.1 表示タイミング

- **表示条件**: 棚卸し計算保存完了後
- **表示頻度**: 1 回の計算につき 1 回
- **自動再表示**: なし（手動制御）

#### 7.3.2 実装フロー

```typescript
// 棚卸し保存後の広告表示
const handleSave = async () => {
  // 1. データ保存
  await saveHistory(...);

  // 2. インタースティシャル広告表示
  const adShown = await showInterstitialAd(() => {
    // 3. 広告終了後のアラート表示
    setTimeout(() => {
      Alert.alert('棚卸し完了', '...');
    }, 500);
  });

  // 4. 広告表示失敗時のフォールバック
  if (!adShown) {
    Alert.alert('棚卸し完了', '...');
  }
};
```

#### 7.3.3 エラーハンドリング

- **広告読み込み失敗**: 静かにスキップ
- **広告表示失敗**: フォールバック処理実行
- **ネットワークエラー**: アプリ機能に影響なし

### 7.4 App Tracking Transparency (ATT)

#### 7.4.1 iOS 対応

- **権限要求**: アプリ起動時
- **説明文**: 広告パーソナライゼーション用
- **フォールバック**: 権限拒否時も広告表示継続

#### 7.4.2 実装詳細

```typescript
// ATT権限要求
export const requestTrackingPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return true;

  try {
    const { status } =
      await TrackingTransparency.requestTrackingPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('ATT permission request error:', error);
    return false;
  }
};
```

### 7.5 収益化戦略

#### 7.5.1 広告収益モデル

- **バナー広告**: 継続的な収益（CPM/CPC）
- **インタースティシャル広告**: 高単価収益（CPI/CPA）
- **表示頻度**: 適度な頻度でユーザー体験を損なわない

#### 7.5.2 ユーザー体験配慮

- **適切なタイミング**: 自然な操作フローでの表示
- **スキップ可能**: 広告による操作ブロックなし
- **パフォーマンス**: 広告読み込みによる遅延最小化

---

## 8. 認証・セキュリティ

### 8.1 認証システム

#### 8.1.1 Supabase Auth

- **プロバイダー**: メール認証
- **セッション管理**: JWT トークン
- **自動更新**: リフレッシュトークン
- **永続化**: AsyncStorage

#### 8.1.2 セキュリティ機能

```typescript
// セキュアなSupabaseクライアント設定
const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 8.2 データセキュリティ

#### 8.2.1 Row Level Security (RLS)

```sql
-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view their own assets" ON multiple_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets" ON multiple_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 8.2.2 データ検証

- **クライアント側**: 入力値のバリデーション
- **サーバー側**: データベース制約
- **型安全性**: TypeScript による型チェック

### 8.3 プライバシー保護

#### 8.3.1 データ最小化

- **必要最小限**: ユーザー識別に必要な情報のみ収集
- **匿名化**: 個人を特定できない形でのデータ処理
- **削除権**: ユーザーの完全なデータ削除権

#### 8.3.2 透明性

- **データ使用目的**: 明確な説明
- **削除手順**: 簡単なアカウント削除
- **アクセス権**: ユーザー自身のデータのみアクセス可能

---

## 9. パフォーマンス

### 9.1 フロントエンド最適化

#### 9.1.1 React 最適化

```typescript
// useCallback による再レンダリング防止
const fetchAssets = useCallback(async () => {
  // 資産データ取得処理
}, [user?.id]);

// useMemo による計算結果キャッシュ
const totalAssets = useMemo(() => {
  return calculateTotal(assets);
}, [assets]);
```

#### 9.1.2 コンポーネント最適化

- **React.memo**: 不要な再レンダリング防止
- **分割読み込み**: 必要な時のみコンポーネント読み込み
- **画像最適化**: 適切なサイズ・フォーマット

### 9.2 データベース最適化

#### 9.2.1 インデックス設計

```sql
-- 頻繁に使用されるクエリ用のインデックス
CREATE INDEX idx_multiple_assets_user_id ON multiple_assets(user_id);
CREATE INDEX idx_asset_history_created_at ON asset_history(created_at);
```

#### 9.2.2 クエリ最適化

- **適切な SELECT**: 必要なカラムのみ取得
- **LIMIT/OFFSET**: ページネーション
- **JOIN 最適化**: 必要最小限の結合

### 9.3 ネットワーク最適化

#### 9.3.1 データ転送量削減

- **圧縮**: gzip 圧縮の活用
- **キャッシュ**: 適切なキャッシュ戦略
- **差分更新**: 変更分のみ転送

#### 9.3.2 エラーハンドリング

```typescript
// ネットワークエラー時の適切な処理
try {
  const result = await supabase.from('table').select();
} catch (error) {
  // ユーザーフレンドリーなエラー表示
  Alert.alert('エラー', 'ネットワークエラーが発生しました');
}
```

### 9.4 メモリ管理

#### 9.4.1 メモリリーク防止

- **useEffect クリーンアップ**: イベントリスナーの削除
- **画像キャッシュ**: 適切なメモリ管理
- **状態管理**: 不要な状態の削除

#### 9.4.2 パフォーマンス監視

- **React DevTools**: プロファイリング
- **Metro Bundle Analyzer**: バンドルサイズ分析
- **Flipper**: デバッグ・プロファイリング

---

## 10. 開発・デプロイ

### 10.1 開発環境

#### 10.1.1 必要なツール

- **Node.js**: 18.x 以上
- **Expo CLI**: 最新版
- **Xcode**: iOS 開発用
- **Android Studio**: Android 開発用
- **Supabase CLI**: データベース管理用

#### 10.1.2 セットアップ手順

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd asset-management

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env

# 4. 開発サーバー起動
npm run dev

# 5. iOSビルド
npm run ios

# 6. Androidビルド
npm run android
```

### 10.2 ビルド設定

#### 10.2.1 Expo Configuration

```json
{
  "expo": {
    "name": "Polaris ― あなたのお金の羅針盤",
    "slug": "bolt-expo-nativewind",
    "version": "1.0.0",
    "orientation": "portrait",
    "ios": {
      "bundleIdentifier": "com.appsaikou.polaris.finance",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.appsaikou.polaris.finance",
      "versionCode": 1
    }
  }
}
```

#### 10.2.2 EAS Build 設定

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### 10.3 デプロイメント

#### 10.3.1 開発ビルド

```bash
# 開発ビルド作成
eas build --profile development --platform ios

# テストフライト配信
eas submit --platform ios
```

#### 10.3.2 本番ビルド

```bash
# 本番ビルド作成
eas build --profile production --platform all

# App Store配信
eas submit --platform ios
```

### 10.4 CI/CD

#### 10.4.1 GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build and Test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
```

#### 10.4.2 自動デプロイ

- **main ブランチ**: 自動本番ビルド
- **develop ブランチ**: 自動開発ビルド
- **プルリクエスト**: 自動テスト実行

---

## 11. 今後の拡張計画

### 11.1 短期計画 (3-6 ヶ月)

#### 11.1.1 機能拡張

- **資産編集機能**: 既存資産の編集・更新
- **資産タイプ追加**: 不動産、暗号資産、債券など
- **グラフ表示**: 資産推移の可視化
- **エクスポート機能**: CSV/PDF 出力

#### 11.1.2 UX 改善

- **ダークモード**: テーマ切り替え機能
- **アニメーション**: スムーズな画面遷移
- **ジェスチャー**: スワイプ操作の追加
- **音響フィードバック**: 操作音の追加

### 11.2 中期計画 (6-12 ヶ月)

#### 11.2.1 高度な機能

- **ポートフォリオ分析**: リスク・リターン分析
- **目標設定**: 資産形成目標の設定・追跡
- **アラート機能**: 価格変動通知
- **データ同期**: 複数デバイス間の同期

#### 11.2.2 サブスクリプション

- **プレミアム機能**: 高度な分析機能
- **広告非表示**: サブスクリプション特典
- **優先サポート**: カスタマーサポート
- **早期アクセス**: 新機能の先行利用

### 11.3 長期計画 (1-2 年)

#### 11.3.1 プラットフォーム拡張

- **Web 版**: ブラウザ対応
- **デスクトップ版**: Electron 版
- **API 提供**: サードパーティ連携

#### 11.3.2 エコシステム構築

- **金融機関連携**: 銀行 API 連携
- **投資プラットフォーム**: 証券会社 API 連携
- **税務対応**: 確定申告データ出力
- **アドバイザー機能**: AI 投資アドバイス

### 11.4 技術的改善

#### 11.4.1 アーキテクチャ進化

- **マイクロサービス**: 機能別サービス分割
- **GraphQL**: 効率的なデータ取得
- **PWA 対応**: プログレッシブ Web アプリ
- **オフライン対応**: ネットワーク不要での基本操作

#### 11.4.2 パフォーマンス向上

- **サーバーサイドレンダリング**: 初期表示高速化
- **CDN 活用**: 静的リソース配信最適化
- **データベース最適化**: クエリパフォーマンス向上
- **キャッシュ戦略**: 多層キャッシュ実装

---

## 📊 付録

### A. 用語集

| 用語 | 説明                                                       |
| ---- | ---------------------------------------------------------- |
| RLS  | Row Level Security - PostgreSQL の行レベルセキュリティ機能 |
| ATT  | App Tracking Transparency - iOS のトラッキング許可システム |
| CPM  | Cost Per Mille - 広告の 1000 回表示あたりの料金            |
| CPI  | Cost Per Install - アプリインストールあたりの料金          |
| FAB  | Floating Action Button - フローティングアクションボタン    |
| JWT  | JSON Web Token - 認証用のトークン形式                      |

### B. 技術仕様サマリー

| 項目             | 仕様                              |
| ---------------- | --------------------------------- |
| フロントエンド   | React Native 0.81.4 + Expo 54.0.0 |
| バックエンド     | Supabase (PostgreSQL)             |
| 認証             | Supabase Auth                     |
| 広告             | Google Mobile Ads 15.7.0          |
| 言語             | TypeScript 5.9.2                  |
| プラットフォーム | iOS 16.0+, Android API 21+        |

### C. データベーススキーマ

```sql
-- 主要テーブル構成
multiple_assets (資産テーブル)
├── id (UUID, PK)
├── user_id (UUID, FK)
├── type (VARCHAR, 'cash'|'stock')
├── name (VARCHAR)
├── amount (BIGINT)
├── annual_rate (DECIMAL)
├── memo (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

asset_history (履歴テーブル)
├── id (UUID, PK)
├── user_id (UUID, FK)
├── current_assets (BIGINT)
├── annual_rate (DECIMAL)
├── years (INTEGER)
├── future_value (BIGINT)
├── increase_amount (BIGINT)
└── created_at (TIMESTAMP)

asset_history_details (履歴詳細テーブル)
├── id (UUID, PK)
├── history_id (UUID, FK)
├── asset_id (UUID)
├── asset_name (VARCHAR)
├── asset_type (VARCHAR)
├── original_amount (BIGINT)
├── adjusted_amount (BIGINT)
└── annual_rate (DECIMAL)
```

---

**仕様書作成日**: 2024 年 1 月
**最終更新**: 2024 年 1 月
**バージョン**: 1.0.0
**作成者**: 開発チーム
