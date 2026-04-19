# Tanao - 資産管理アプリ 詳細仕様書

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

**Tanao（タナオ）** - あなたの資産トラッカー

### 1.2 バージョン情報

- **現在のバージョン**: 1.0.0
- **ビルド番号**: 1 (iOS), 1 (Android)
- **リリース日**: 2024 年 1 月

### 1.3 アプリケーション概要

Tanao は、個人の資産管理と将来価値予測に特化したモバイルアプリケーションです。複数の資産タイプ（現金、株式）を統合管理し、ユーザーの年齢や設定した目標年齢に基づいた複利計算による将来価値を予測します。直感的な UI とリアルタイム計算により、投資戦略の立案をサポートします。

### 1.4 ターゲットユーザー

- 個人投資家
- 資産管理に興味のある一般ユーザー
- 将来の資産形成を計画するユーザー
- 複数の資産を統合管理したいユーザー

### 1.5 主要機能

1. **マルチアセット管理**: 現金・株式の統合管理
2. **年齢ベース予測**: 生年月日と目標年齢に基づいた将来価値シミュレーション
3. **月次プロジェクション**: 100歳までの月単位での資産推移予測
4. **棚卸し機能**: 資産調整とリアルタイム計算
5. **履歴管理**: 計算結果の時系列保存
6. **広告収益化**: バナー・インタースティシャル広告

---

## 2. 技術スタック

### 2.1 フロントエンド

- **React Native**: 0.81.4
- **Expo SDK**: 54.0.0
- **TypeScript**: 5.9.2
- **Expo Router**: 6.0.6 (ファイルベースルーティング)

### 2.2 状態管理・データフロー

- **React Hooks**: useState, useEffect, useCallback, useMemo
- **Context API**: AuthContext (認証), InterstitialAdContext (広告)
- **Custom Hooks**: 機能別データ管理 (useAssetHistory, useProjection, useOnboarding 等)

### 2.3 バックエンド・データベース

- **Supabase**: PostgreSQL + リアルタイム機能
- **Row Level Security (RLS)**: ユーザー別データ分離
- **Remote Procedure Calls (RPC)**: 複雑なクエリ・削除処理

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
- **react-native-gifted-charts**: グラフ描画
- **@react-native-community/datetimepicker**: 日付選択
- **@react-native-community/slider**: スライダー入力

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
├── onboarding/             # オンボーディングフロー
│   └── index.tsx
├── history-detail.tsx      # 履歴詳細画面
├── inventory-step.tsx      # 棚卸しステップ画面
└── inventory-adjustment.tsx # 棚卸し調整画面
```

### 3.2 コンポーネント設計

```
components/
├── AdBanner.tsx            # バナー広告
├── AssetSectionCard.tsx    # 資産セクション
├── CalculationResultModal.tsx # 計算結果モーダル
├── FloatingActionButton.tsx # FAB
├── InventoryButton.tsx     # 棚卸しボタン
├── TotalAssetCard.tsx      # 総資産カード
├── onboarding/             # オンボーディング用コンポーネント
│   ├── OnboardingStep1.tsx # 生年月日入力
│   ├── OnboardingStep2.tsx # 現在資産入力
│   ├── OnboardingStep3.tsx # 予算入力
│   └── OnboardingStep4.tsx # 目標設定
```

### 3.3 カスタムフック

```
hooks/
├── useAuth.ts              # 認証管理
├── useMultipleAssets.tsx   # マルチアセット管理
├── useAssetHistory.ts      # 履歴管理
├── useProjection.ts        # 将来予測計算
├── useAgeBasedCalculation.ts # 年齢ベース計算
├── useOnboarding.ts        # オンボーディング管理
└── useBudget.ts            # 予算管理
```

---

## 4. データベース設計

### 4.1 テーブル構成

#### 4.1.1 ユーザー基本情報

**user_profiles**
- ユーザーの基本情報（生年月日、オンボーディング完了状態など）を管理

```sql
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  birth_date DATE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.1.2 資産・予算管理

**multiple_assets**
- 個別の資産（現金、株式）を管理

```sql
CREATE TABLE multiple_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('cash', 'stock')),
  name VARCHAR(100),
  amount NUMERIC DEFAULT 0,
  annual_rate NUMERIC DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**user_budget_periods**
- 月次の収支・投資予算を管理

```sql
CREATE TABLE user_budget_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('income', 'expense', 'investment')),
  monthly_amount NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  -- 外部キーなど
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.1.3 予測・履歴管理

**user_calculation_ages**
- 目標年齢設定を管理

```sql
CREATE TABLE user_calculation_ages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_age INTEGER,
  target_month INTEGER DEFAULT 0,
  target_amount NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**projection_runs**
- 予測計算の実行単位を管理

```sql
CREATE TABLE projection_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**monthly_asset_projections**
- 月ごとの資産推移予測データを保存

```sql
CREATE TABLE monthly_asset_projections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projection_run_id UUID REFERENCES projection_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES multiple_assets(id),
  month_year DATE,
  balance NUMERIC,
  contribution NUMERIC,
  rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**target_age_snapshots**
- 目標年齢到達時のスナップショット

```sql
CREATE TABLE target_age_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_age INTEGER,
  total_balance NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**asset_history**
- 棚卸し時点の履歴データ

```sql
CREATE TABLE asset_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  projection_run_id UUID REFERENCES projection_runs(id),
  current_assets NUMERIC,
  annual_rate NUMERIC,
  years INTEGER,
  future_value NUMERIC,
  increase_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 機能仕様

### 5.1 オンボーディング
- **Step 1**: 生年月日入力（@react-native-community/datetimepicker）
- **Step 2**: 現在資産入力（現金・株式、スライダー操作）
- **Step 3**: 毎月の予算入力（収入・支出・投資、スライダー操作）
- **Step 4**: 目標設定（目標年齢・目標金額、スライダー操作）

### 5.2 資産・予算管理
- **資産登録**: 資産タイプ、金額、想定年利の設定
- **予算設定**: 毎月の収支と投資配分の設定（自動計算ロジック含む）

### 5.3 将来予測・計算
- **月次プロジェクション**: 現在から100歳までの月次資産推移を計算
- **複利計算**: 各資産の年利と毎月の投資額（予算）を考慮
- **目標達成予測**: 設定した目標年齢時点での資産額を算出

### 5.4 棚卸し・履歴
- **棚卸しモード**: 現在の資産額を再確認・修正し、予測を再計算
- **履歴詳細**: 過去の計算時点での予測グラフ（LineChart）を表示
- **比較**: 目標金額とのギャップや前回からの増減を表示

### 5.5 広告システム
- **バナー**: 画面下部に常時表示（無料プラン）
- **インタースティシャル**: 棚卸し保存時などに表示

---

## 6. UI/UX 設計

### 6.1 デザインシステム
- **カラー**: ベース（白/グレー）、プライマリ（青系）、アクセント（緑/赤）
- **フォント**: システムフォント準拠
- **コンポーネント**: カード型レイアウト、モーダル、スライダー中心の入力

### 6.2 グラフ表示
- **ライブラリ**: `react-native-gifted-charts`
- **機能**:
  - 資産推移のラインチャート
  - ツールチップによる詳細表示
  - 目標年齢・目標金額ラインの表示
  - ピンチイン・アウト（スクロール対応）

---

## 7. 広告システム

### 7.1 プラットフォーム
- **Google Mobile Ads (AdMob)**

### 7.2 実装
- **バナー**: `BannerAd` コンポーネント
- **インタースティシャル**: `useInterstitialAd` フックによる制御
- **ATT**: iOS向けトラッキング許可リクエスト実装済み

---

## 8. 認証・セキュリティ

- **Supabase Auth**: メール/パスワード認証
- **RLS**: ユーザーIDに基づく厳格なデータアクセス制御
- **データ保護**: 他ユーザーのデータは参照不可

---

## 9. 今後の拡張計画

### 9.1 短期
- **資産編集機能の強化**: より詳細な編集
- **グラフのUX改善**: 操作性の向上

### 9.2 中長期
- **サブスクリプション**: Proプラン（広告非表示、高度な分析）
- **アセットタイプ拡充**: 不動産、暗号資産など
- **データエクスポート**: CSV/PDF出力
