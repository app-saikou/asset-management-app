# AdMob 広告実装ガイド

## 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [AdMob 設定](#admob設定)
4. [インタースティシャル広告の実装](#インタースティシャル広告の実装)
5. [バナー広告の実装](#バナー広告の実装)
6. [Pro ユーザーとの関係](#proユーザーとの関係)
7. [エラーハンドリング](#エラーハンドリング)
8. [AI エージェント用プロンプト](#aiエージェント用プロンプト)

---

## 概要

このアプリケーションは、**Google AdMob**を使用してインタースティシャル広告とバナー広告を実装しています。Free ユーザーにのみ広告を表示し、Pro ユーザーには広告を表示しない仕様になっています。

### 主な機能

- **インタースティシャル広告**: 画面遷移時に表示される全画面広告
- **バナー広告**: タブバーの上に常時表示されるバナー広告
- **Pro ユーザー対応**: Pro ユーザーには広告を表示しない
- **プリロード機能**: 広告を事前に読み込んで表示速度を向上
- **自動再読み込み**: 広告表示後に自動的に次の広告をプリロード

### 技術スタック

- **react-native-google-mobile-ads**: AdMob SDK の React Native ラッパー
- **Expo**: モバイルアプリフレームワーク
- **React Native**: モバイルアプリフレームワーク

---

## アーキテクチャ

### データフロー

```
アプリ起動
    ↓
AdMob初期化 (initializeAdMob)
    ↓
インタースティシャル広告のプリロード
    ↓
ユーザー操作（画面遷移など）
    ↓
Pro判定 (isPro)
    ↓
Freeユーザーの場合のみ広告表示
    ↓
広告表示後、次の広告を自動プリロード
```

### 主要コンポーネント

1. **`src/utils/admob.ts`**: AdMob SDK のラッパー関数
2. **`src/components/common/BannerAd.tsx`**: バナー広告コンポーネント
3. **`App.tsx`**: AdMob の初期化とバナー広告の配置
4. **`src/screens/InputScreen.tsx`**: インタースティシャル広告の表示箇所
5. **`src/screens/DraftEditScreen.tsx`**: インタースティシャル広告の表示箇所

---

## AdMob 設定

### app.json の設定

`app.json`で AdMob プラグインを設定します。

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-3940256099942544~3347511713",
          "iosAppId": "ca-app-pub-3940256099942544~1458002511"
        }
      ]
    ]
  }
}
```

**注意**: 上記の App ID はテスト用です。本番環境では、AdMob ダッシュボードから取得した実際の App ID を使用してください。

### 広告ユニット ID

#### テスト用 ID

- **インタースティシャル**: `TestIds.INTERSTITIAL`
- **バナー**: `TestIds.BANNER`

#### 本番用 ID

`src/utils/admob.ts`で設定します。

```typescript
const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL // テスト広告ID
  : "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"; // 本番用広告ID

export const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER // テスト広告ID
  : "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"; // 本番用広告ID
```

---

## インタースティシャル広告の実装

### 初期化 (`src/utils/admob.ts`)

```typescript
import mobileAds, {
  InterstitialAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

// AdMobの初期化
export const initializeAdMob = async () => {
  try {
    await mobileAds().initialize();
    console.log("[AdMob] AdMob initialized");
    // 初期化後、少し待ってから最初の広告をプリロード
    setTimeout(() => {
      console.log("[AdMob] Starting initial ad preload");
      preloadInterstitialAd();
    }, 1000);
  } catch (error: any) {
    // Expo Goではネイティブモジュールが利用できないため、エラーを無視
    if (
      error?.message?.includes("TurboModuleRegistry") ||
      error?.message?.includes("RNGoogleMobileAdsModule")
    ) {
      console.warn(
        "[AdMob] AdMob module not available (likely running in Expo Go). Ads will be disabled."
      );
    } else {
      console.error("[AdMob] AdMob initialization error:", error);
    }
  }
};
```

### プリロード機能

```typescript
// インタースティシャル広告のインスタンスを管理
let interstitialAd: InterstitialAd | null = null;
let isAdLoaded = false;
let isLoading = false;

// インタースティシャル広告をプリロード
const preloadInterstitialAd = () => {
  // 既に読み込み中または読み込み済みの場合はスキップ
  if (isLoading || isAdLoaded) {
    return;
  }

  isLoading = true;
  isAdLoaded = false;

  try {
    interstitialAd = InterstitialAd.createForAdRequest(
      INTERSTITIAL_AD_UNIT_ID,
      {
        requestNonPersonalizedAdsOnly: true, // パーソナライズされていない広告のみをリクエスト
      }
    );

    const unsubscribeLoaded = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        unsubscribeLoaded();
        unsubscribeError();
        isAdLoaded = true;
        isLoading = false;
        console.log("[AdMob] Interstitial ad preloaded successfully");
      }
    );

    const unsubscribeError = interstitialAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        unsubscribeLoaded();
        unsubscribeError();
        console.error("[AdMob] Interstitial ad preload error:", error);
        isAdLoaded = false;
        isLoading = false;
        // エラーが発生した場合、少し待ってから再試行
        setTimeout(() => {
          console.log("[AdMob] Retrying preload after error");
          preloadInterstitialAd();
        }, 5000);
      }
    );

    interstitialAd.load();
  } catch (error) {
    console.error("Failed to preload interstitial ad:", error);
    isLoading = false;
  }
};
```

### 広告表示機能

```typescript
export const showInterstitialAd = async (): Promise<boolean> => {
  console.log("[AdMob] showInterstitialAd called", {
    isAdLoaded,
    isLoading,
    hasAd: interstitialAd !== null,
  });

  try {
    // 広告が読み込まれている場合、すぐに表示
    if (isAdLoaded && interstitialAd) {
      console.log("[AdMob] Showing preloaded ad");
      try {
        // 広告を閉じた後、次の広告を自動的にプリロードするリスナーを追加
        const unsubscribeClosed = interstitialAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            unsubscribeClosed();
            console.log("[AdMob] Ad closed, preloading next ad");
            // 広告を閉じた後、次の広告をプリロード
            isAdLoaded = false;
            interstitialAd = null;
            setTimeout(() => {
              preloadInterstitialAd();
            }, 1000);
          }
        );

        await interstitialAd.show();
        console.log("[AdMob] Ad shown successfully");
        isAdLoaded = false; // 表示したので、読み込み済みフラグをリセット
        return true;
      } catch (error) {
        console.error("[AdMob] Failed to show preloaded ad:", error);
        isAdLoaded = false;
        interstitialAd = null;
        // 表示に失敗した場合、新しい広告をプリロード
        preloadInterstitialAd();
        return false;
      }
    }

    // 広告が読み込まれていない場合、新しい広告を読み込んで表示
    console.log("[AdMob] Ad not loaded, starting preload");
    if (!isLoading) {
      preloadInterstitialAd();
    }

    // 広告が読み込まれるまで待つ（最大5秒）
    const maxWaitTime = 5000;
    const startTime = Date.now();

    console.log("[AdMob] Waiting for ad to load (max 5s)");
    while (!isAdLoaded && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (isAdLoaded && interstitialAd) {
      console.log("[AdMob] Ad loaded after wait, showing");
      try {
        // 広告を閉じた後、次の広告を自動的にプリロードするリスナーを追加
        const unsubscribeClosed = interstitialAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            unsubscribeClosed();
            console.log("[AdMob] Ad closed, preloading next ad");
            // 広告を閉じた後、次の広告をプリロード
            isAdLoaded = false;
            interstitialAd = null;
            setTimeout(() => {
              preloadInterstitialAd();
            }, 1000);
          }
        );

        await interstitialAd.show();
        console.log("[AdMob] Ad shown successfully after wait");
        isAdLoaded = false;
        return true;
      } catch (error) {
        console.error("[AdMob] Failed to show ad after wait:", error);
        isAdLoaded = false;
        interstitialAd = null;
        return false;
      }
    }

    // タイムアウトした場合、次の広告をプリロードして終了
    console.warn("[AdMob] Timeout waiting for ad, preloading for next time");
    preloadInterstitialAd();
    return false;
  } catch (error) {
    console.error("[AdMob] Failed to show interstitial ad:", error);
    preloadInterstitialAd();
    return false;
  }
};
```

### 使用例

#### InputScreen.tsx

```typescript
import { showInterstitialAd } from "../utils/admob";

const handleAbstract = async () => {
  // ... 抽象化処理 ...

  // 成功後、画面遷移
  navigation.navigate("AbstractionResult", {
    insight,
    abstraction: result.abstraction,
    selectedIdeas: result.transferIdeas,
  });

  // Proプランでない場合のみインタースティシャル広告を表示
  // 画面遷移後に広告を表示することで、広告が表示される確率を上げる
  if (!isPro) {
    // 少し待ってから広告を表示（画面遷移のアニメーションが始まってから）
    setTimeout(() => {
      showInterstitialAd().catch((error) => {
        console.error("Failed to show ad:", error);
      });
    }, 500);
  }
};
```

#### DraftEditScreen.tsx

```typescript
import { showInterstitialAd } from "../utils/admob";

const handleSave = async () => {
  // ... 保存処理 ...

  // 成功後、画面遷移
  navigation.goBack();

  // Proプランでない場合のみインタースティシャル広告を表示
  if (!isPro) {
    setTimeout(() => {
      showInterstitialAd().catch((error) => {
        console.error("Failed to show ad:", error);
      });
    }, 500);
  }
};
```

### 広告表示のタイミング

1. **抽象化処理完了後**: `InputScreen`で抽象化処理が成功した後
2. **下書き保存後**: `DraftEditScreen`で下書きを保存した後

**注意**: 画面遷移のアニメーションが始まってから広告を表示することで、広告が表示される確率を上げています。

---

## バナー広告の実装

### BannerAd コンポーネント (`src/components/common/BannerAd.tsx`)

```typescript
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { BANNER_AD_UNIT_ID } from "../../utils/admob";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

interface BannerAdComponentProps {
  onHeightChange?: (height: number) => void;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  onHeightChange,
}) => {
  const { colors } = useTheme();
  const { isPro } = useAuth();

  // バナー広告の高さ（50px + パディング16px = 66px）
  const bannerHeight = 66;

  // すべてのhooksをコンポーネントのトップレベルで呼び出す
  useEffect(() => {
    if (isPro && onHeightChange) {
      onHeightChange(0);
    } else if (!isPro && onHeightChange) {
      onHeightChange(bannerHeight);
    }
  }, [isPro, onHeightChange, bannerHeight]);

  // Proプランの場合は広告を表示しない
  if (isPro) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        if (onHeightChange && height > 0) {
          onHeightChange(height);
        }
      }}
    >
      <BannerAd
        unitId={__DEV__ ? TestIds.BANNER : BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 66, // バナー50px + パディング16px
  },
});
```

### App.tsx での配置

```typescript
import { BannerAdComponent } from "./src/components/common/BannerAd";

const MainTabNavigator = () => {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      // ... タブナビゲーターの設定 ...
      >
        {/* タブ画面 */}
      </Tab.Navigator>
      {/* タブバーの上にバナー広告を表示 */}
      <View style={{ position: "absolute", bottom: 92, left: 0, right: 0 }}>
        <BannerAdComponent />
      </View>
    </View>
  );
};
```

### バナー広告の高さ調整

`HomeScreen`などで、バナー広告の高さを考慮してレイアウトを調整します。

```typescript
const { isPro } = useAuth();

// バナー広告の高さ分上に移動（Freeプランの場合）
<View style={{ bottom: 30 + (isPro ? 0 : 66) }}>{/* コンテンツ */}</View>;
```

---

## Pro ユーザーとの関係

### Pro ユーザーの判定

`useAuth()`フックから`isPro`を取得します。

```typescript
const { isPro } = useAuth();
```

### インタースティシャル広告

Pro ユーザーの場合は、広告を表示しません。

```typescript
if (!isPro) {
  setTimeout(() => {
    showInterstitialAd().catch((error) => {
      console.error("Failed to show ad:", error);
    });
  }, 500);
}
```

### バナー広告

Pro ユーザーの場合は、コンポーネント自体をレンダリングしません。

```typescript
// Proプランの場合は広告を表示しない
if (isPro) {
  return null;
}
```

### レイアウト調整

Pro ユーザーの場合は、バナー広告の高さを考慮する必要がありません。

```typescript
// Freeユーザー: バナー広告の高さ分（66px）を考慮
// Proユーザー: バナー広告がないため、0px
const bottomOffset = isPro ? 0 : 66;
```

---

## エラーハンドリング

### 初期化エラー

Expo Go ではネイティブモジュールが利用できないため、エラーを無視します。

```typescript
try {
  await mobileAds().initialize();
} catch (error: any) {
  if (
    error?.message?.includes("TurboModuleRegistry") ||
    error?.message?.includes("RNGoogleMobileAdsModule")
  ) {
    console.warn(
      "[AdMob] AdMob module not available (likely running in Expo Go). Ads will be disabled."
    );
  } else {
    console.error("[AdMob] AdMob initialization error:", error);
  }
}
```

### プリロードエラー

エラーが発生した場合、5 秒後に再試行します。

```typescript
const unsubscribeError = interstitialAd.addAdEventListener(
  AdEventType.ERROR,
  (error) => {
    unsubscribeLoaded();
    unsubscribeError();
    console.error("[AdMob] Interstitial ad preload error:", error);
    isAdLoaded = false;
    isLoading = false;
    // エラーが発生した場合、少し待ってから再試行
    setTimeout(() => {
      console.log("[AdMob] Retrying preload after error");
      preloadInterstitialAd();
    }, 5000);
  }
);
```

### 表示エラー

表示に失敗した場合、エラーをログに記録し、次の広告をプリロードします。

```typescript
try {
  await interstitialAd.show();
} catch (error) {
  console.error("[AdMob] Failed to show preloaded ad:", error);
  isAdLoaded = false;
  interstitialAd = null;
  // 表示に失敗した場合、新しい広告をプリロード
  preloadInterstitialAd();
  return false;
}
```

### タイムアウト処理

広告の読み込みがタイムアウトした場合、次の広告をプリロードして終了します。

```typescript
// タイムアウトした場合、次の広告をプリロードして終了
console.warn("[AdMob] Timeout waiting for ad, preloading for next time");
preloadInterstitialAd();
return false;
```

---

## AI エージェント用プロンプト

以下のプロンプトを AI エージェントに投げることで、このアプリと同じレベルの広告機能を実装できます。

````markdown
# AdMob 広告システムの実装

## 要件

React Native（Expo）アプリで、Google AdMob を使用したインタースティシャル広告とバナー広告を実装してください。

## 技術スタック

- **フロントエンド**: React Native (Expo)
- **広告 SDK**: react-native-google-mobile-ads
- **状態管理**: React Context API (AuthContext)

## AdMob 設定

### app.json の設定

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-3940256099942544~3347511713",
          "iosAppId": "ca-app-pub-3940256099942544~1458002511"
        }
      ]
    ]
  }
}
```

**注意**: 上記の App ID はテスト用です。本番環境では、AdMob ダッシュボードから取得した実際の App ID を使用してください。

### 広告ユニット ID

- **インタースティシャル**: `TestIds.INTERSTITIAL`（テスト）/ `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`（本番）
- **バナー**: `TestIds.BANNER`（テスト）/ `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`（本番）

## 実装要件

### 1. AdMob ラッパー (`src/utils/admob.ts`)

以下の関数を実装してください：

- `initializeAdMob()`: AdMob を初期化し、最初のインタースティシャル広告をプリロード
- `preloadInterstitialAd()`: インタースティシャル広告を事前に読み込む（内部関数）
- `showInterstitialAd()`: インタースティシャル広告を表示
- `getInterstitialAdStatus()`: 広告の状態を取得（デバッグ用）

#### 実装のポイント

1. **プリロード機能**: 広告を事前に読み込んでおくことで、表示速度を向上
2. **自動再読み込み**: 広告表示後、自動的に次の広告をプリロード
3. **エラーハンドリング**: エラーが発生した場合、5 秒後に再試行
4. **タイムアウト処理**: 広告の読み込みがタイムアウトした場合、次の広告をプリロード
5. **パーソナライズされていない広告**: `requestNonPersonalizedAdsOnly: true`を設定

#### 状態管理

```typescript
let interstitialAd: InterstitialAd | null = null;
let isAdLoaded = false;
let isLoading = false;
```

#### プリロードロジック

- 既に読み込み中または読み込み済みの場合はスキップ
- `AdEventType.LOADED`イベントで読み込み完了を検知
- `AdEventType.ERROR`イベントでエラーを検知し、5 秒後に再試行

#### 表示ロジック

1. 広告が読み込まれている場合、すぐに表示
2. 広告が読み込まれていない場合、新しい広告を読み込んで表示（最大 5 秒待機）
3. タイムアウトした場合、次の広告をプリロードして終了
4. 広告を閉じた後（`AdEventType.CLOSED`）、自動的に次の広告をプリロード

### 2. BannerAd コンポーネント (`src/components/common/BannerAd.tsx`)

以下の機能を実装してください：

- Pro ユーザーの場合は広告を表示しない
- Free ユーザーの場合のみバナー広告を表示
- `onHeightChange`コールバックで広告の高さを通知
- テーマに応じたスタイリング

#### 実装のポイント

1. **Pro ユーザー判定**: `useAuth()`から`isPro`を取得
2. **高さ通知**: `onHeightChange`コールバックで広告の高さ（66px）を通知
3. **レイアウト調整**: Pro ユーザーの場合は`onHeightChange(0)`を呼び出し

### 3. App.tsx での初期化と配置

#### 初期化

```typescript
import { initializeAdMob } from "./src/utils/admob";

export default function App() {
  useEffect(() => {
    initializeAdMob();
  }, []);

  return (
    // ... アプリのコンテンツ ...
  );
}
```

#### バナー広告の配置

タブバーの上にバナー広告を配置します。

```typescript
import { BannerAdComponent } from "./src/components/common/BannerAd";

const MainTabNavigator = () => {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator>{/* タブ画面 */}</Tab.Navigator>
      {/* タブバーの上にバナー広告を表示 */}
      <View style={{ position: "absolute", bottom: 92, left: 0, right: 0 }}>
        <BannerAdComponent />
      </View>
    </View>
  );
};
```

### 4. インタースティシャル広告の表示箇所

以下の箇所でインタースティシャル広告を表示してください：

1. **抽象化処理完了後** (`InputScreen.tsx`): 抽象化処理が成功した後、画面遷移時に表示
2. **下書き保存後** (`DraftEditScreen.tsx`): 下書きを保存した後、画面遷移時に表示

#### 実装のポイント

1. **Pro ユーザー判定**: `isPro`が`false`の場合のみ広告を表示
2. **タイミング**: 画面遷移のアニメーションが始まってから広告を表示（500ms 待機）
3. **エラーハンドリング**: 広告表示に失敗した場合、エラーをログに記録（ユーザーには表示しない）

#### 実装例

```typescript
import { showInterstitialAd } from "../utils/admob";

const handleAction = async () => {
  // ... 処理 ...

  // 成功後、画面遷移
  navigation.navigate("NextScreen");

  // Proプランでない場合のみインタースティシャル広告を表示
  if (!isPro) {
    setTimeout(() => {
      showInterstitialAd().catch((error) => {
        console.error("Failed to show ad:", error);
      });
    }, 500);
  }
};
```

### 5. レイアウト調整

バナー広告の高さを考慮してレイアウトを調整してください。

```typescript
const { isPro } = useAuth();

// Freeユーザー: バナー広告の高さ分（66px）を考慮
// Proユーザー: バナー広告がないため、0px
const bottomOffset = isPro ? 0 : 66;

<View style={{ bottom: 30 + bottomOffset }}>{/* コンテンツ */}</View>;
```

### 6. エラーハンドリング

#### 初期化エラー

Expo Go ではネイティブモジュールが利用できないため、エラーを無視します。

```typescript
try {
  await mobileAds().initialize();
} catch (error: any) {
  if (
    error?.message?.includes("TurboModuleRegistry") ||
    error?.message?.includes("RNGoogleMobileAdsModule")
  ) {
    console.warn(
      "[AdMob] AdMob module not available (likely running in Expo Go). Ads will be disabled."
    );
  } else {
    console.error("[AdMob] AdMob initialization error:", error);
  }
}
```

#### プリロードエラー

エラーが発生した場合、5 秒後に再試行します。

#### 表示エラー

表示に失敗した場合、エラーをログに記録し、次の広告をプリロードします。

#### タイムアウト処理

広告の読み込みがタイムアウトした場合、次の広告をプリロードして終了します。

### 7. Pro ユーザー対応

- **インタースティシャル広告**: Pro ユーザーの場合は広告を表示しない
- **バナー広告**: Pro ユーザーの場合はコンポーネント自体をレンダリングしない
- **レイアウト調整**: Pro ユーザーの場合はバナー広告の高さを考慮しない

## 実装のポイント

1. **プリロード機能**: 広告を事前に読み込んでおくことで、表示速度を向上
2. **自動再読み込み**: 広告表示後、自動的に次の広告をプリロード
3. **エラーハンドリング**: エラーが発生した場合、適切に処理し、再試行
4. **Pro ユーザー対応**: Pro ユーザーには広告を表示しない
5. **レイアウト調整**: バナー広告の高さを考慮してレイアウトを調整
6. **タイミング**: 画面遷移のアニメーションが始まってから広告を表示

## テスト要件

1. **初期化テスト**: AdMob が正しく初期化されることを確認
2. **プリロードテスト**: 広告が正しくプリロードされることを確認
3. **表示テスト**: インタースティシャル広告が正しく表示されることを確認
4. **バナー広告テスト**: バナー広告が正しく表示されることを確認
5. **Pro ユーザーテスト**: Pro ユーザーには広告が表示されないことを確認
6. **エラーハンドリングテスト**: エラーが発生した場合、適切に処理されることを確認
7. **タイムアウトテスト**: 広告の読み込みがタイムアウトした場合、適切に処理されることを確認

実装時は、上記の要件を全て満たし、エッジケースも適切に処理してください。
````

---

## まとめ

このドキュメントは、AdMob 広告実装を包括的に説明しています。同じレベルの実装を行う際は、このドキュメントと AI エージェント用プロンプトを参考にしてください。

### 重要なポイント

1. **プリロード機能**: 広告を事前に読み込んでおくことで、表示速度を向上
2. **自動再読み込み**: 広告表示後、自動的に次の広告をプリロード
3. **Pro ユーザー対応**: Pro ユーザーには広告を表示しない
4. **エラーハンドリング**: エラーが発生した場合、適切に処理し、再試行
5. **レイアウト調整**: バナー広告の高さを考慮してレイアウトを調整
6. **タイミング**: 画面遷移のアニメーションが始まってから広告を表示

### 次のステップ

1. AdMob ダッシュボードでアプリと広告ユニットを作成
2. `app.json`で AdMob プラグインを設定
3. `src/utils/admob.ts`で AdMob ラッパー関数を実装
4. `src/components/common/BannerAd.tsx`でバナー広告コンポーネントを実装
5. `App.tsx`で AdMob を初期化し、バナー広告を配置
6. インタースティシャル広告の表示箇所を実装
7. Pro ユーザー対応を実装
8. テストを実施
