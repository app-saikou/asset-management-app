# 開発ログ

---

## 2026-04-06

### 通知スコープ外変数参照バグの修正

**症状**
通知をONにすると `[ReferenceError: Property 'targetDay' doesn't exist]` が発生。

**原因**
`scheduleMonthlyNotification` 内の `console.log` で、別関数 `calculateNextNotificationDate` のローカル変数 `targetDay` を参照していた。

**修正**
`lib/notifications.ts:274` の `day: targetDay` → `day: day`（引数を参照するように変更）

---

### 通知トグルのUI遅延をオプティミスティック更新で解消

**症状**
Switch トグルを押してから視覚的に切り替わるまで体感で1〜2秒の遅延があった。

**原因**
`hooks/useNotifications.ts` の `updateNotificationSettings` が、権限確認 → 通知スケジュール → DB更新 → profile再取得をすべて完了してから `setNotificationEnabled` を呼んでいた。

**修正**
- 関数冒頭で `setNotificationEnabled / setNotificationDay / setNotificationHour` を即時実行（オプティミスティック更新）
- `catch` ブロックで前の値に戻すロールバック処理を追加
- 成功パスの重複 `setState` 呼び出しを削除

---

## 2026-04-05（続き4）

### ホーム予測カードの計算エンジン統一

**背景**
ホーム画面の `FutureProjectionCard` が `calculateAgeBasedResults`（予算なし・年次複利）を使っており、棚卸しグラフの `MonthlyProjectionEngine`（予算込み・月次複利）と異なる数字を表示していた。

**実装内容**
- `hooks/useHomeProjection.ts` を新規作成
  - `assets` と `ages` を受け取り、`MonthlyProjectionEngine` でオンザフライ計算
  - `user_budget_periods` と `user_profiles.birth_date` をフェッチして渡す
  - DB への書き込みは一切なし（表示専用）
  - `cancelled` フラグでアンマウント時のメモリリーク対策
- `app/(tabs)/index.tsx`
  - `useCalculationAges` から `calculateResults` を削除、`useHomeProjection` に差し替え
  - 旧 `ageBasedResult` の state と useEffect を削除

**既存ユーザーへの影響**
- `target_age_snapshots` テーブルは変更なし（棚卸しグラフ専用で継続使用）
- 計算ロジックの変更のみ（DB スキーマ・保存処理は無変更）

---

### 金額の整数表示統一・通知モーダルバグ修正

- 万円モード・円モードともに金額を整数表示に統一（`Math.round` を追加）
- 通知許可モーダルが通知ON済みユーザーにも毎セッション表示されるバグを修正
  - 原因: `notification_enabled !== false` が `true`（ON）も含んでいた
  - 修正: `=== null`（未設定のみ）に変更

---

## 2026-04-05（続き3）

### 致命的バグ4件の修正

#### 1. `getCurrentAge()` ハードコード30歳を修正

**修正内容**
- `lib/projection.ts`: `MonthlyProjectionEngine` コンストラクタに `birthDate?: string` を追加
- `getCurrentAge()` で生年月日から正確な年齢を計算（誕生日前後で±1を正確に処理）
- `hooks/useProjection.ts`: プロフィール取得処理をエンジン生成前に移動し、`birthDate` を渡すよう変更

**修正前の挙動**: 全ユーザーが30歳として計算され、目標年齢まで誤った年数で複利計算されていた

---

#### 2. 月末通知スキップ問題を修正

**修正内容**
- `lib/notifications.ts`: `scheduleMonthlyNotification` の trigger を `repeats: true` + 固定 `day` から単発 `type: 'date'` に変更
- アプリ起動時（`useFocusEffect`）に毎回次の通知日を計算して再スケジュールする方式に統一

**修正前の挙動**: 月末設定にしても2月・4月など31日がない月は通知が来なかった

---

#### 3. 通知日付比較の時刻欠落を修正

**修正内容**
- `calculateNextNotificationDate(day, hour)` に `hour` パラメータを追加
- 比較用 Date を `new Date(year, month-1, targetDay, hour, 0, 0)` で時刻込みに変更

**修正前の挙動**: 月末9時通知設定でも、月末の朝8時にアプリを開くと「今月は過ぎた」と誤判定して来月にスキップ

---

#### 4. Picker操作の即時保存を修正

**修正内容**
- `app/(tabs)/profile.tsx`: 日・時間 Picker の `onValueChange` から `updateNotificationSettings()` 呼び出しを削除
- 「完了」ボタンの `onPress` に移動

**修正前の挙動**: Pickerをスクロールするたびに通知が全キャンセル＆再スケジュールされ、途中でモーダルを閉じても設定が変更済みになっていた

---

UI/UX改善・機能実装の記録。新しいものが上に来るよう追記すること。

---

## 2026-04-05（続き2）

### 金額表示の「円 / 万円」その場切り替え

**背景**
大きな金額（数千万〜億）は万円表示のほうが直感的。設定画面ではなくホーム画面でその場で切り替えたい。

**実装内容**

`TotalAssetCard` のヘッダー右端に「円 / 万円」トグルバッジを追加。タップで切り替え。

- アクティブな単位が青色で強調表示
- `index.tsx` に `displayInMan` state を追加
- `formatNumberDisplay` ラッパー関数を作成（万円モード時は `Math.round(num / 10000)` + `万` を返す）
- `formatNumberDisplay` を `TotalAssetCard`・`FutureProjectionCard`・`AssetSectionCard`（各 `AssetCard`）すべてに流す → 全画面の金額が一括切り替え

**万円モードの表示例**
```
円モード:   ¥5,234,000
万円モード: ¥523万
```

**バグ修正（同日）**
- 1万円未満の金額が「0万」になる問題 → `num >= 10000` の条件を追加し、それ未満は円表示にフォールバック
- リロードで設定がリセットされる問題 → `AsyncStorage` で永続化。起動時に復元、切り替え時に保存

**関連ファイル**
- `components/TotalAssetCard.tsx`（toggleUI追加）
- `app/(tabs)/index.tsx`（state + フォーマッタ + AsyncStorage永続化）

---

## 2026-04-05（続き）

### ホーム画面への将来予測サマリー常時表示

**背景**
アプリの核心価値「将来いくらになるか」がホーム画面から見えなかった。棚卸しボタンを押さないと見えない状態。

**実装内容**

新規コンポーネント `components/FutureProjectionCard.tsx` を作成。

表示内容:
- 目標年齢（例: 65歳）と将来予測資産額
- 現在からの増加額（緑色で強調）
- 何年後かのバッジ
- 目標金額が設定されている場合: 「目標まであと ¥XX」または「目標達成！」

`app/(tabs)/index.tsx` の変更:
- `assets` を `useMultipleAssets` からデストラクチャリングに追加
- `ages` を `useCalculationAges` から追加
- 資産ロード後に `calculateAgeResults` を呼び出す `useEffect` を追加
- `TotalAssetCard` と タブ切り替えの間に `FutureProjectionCard` を挿入

**動作フロー**
```
資産ロード完了
  → calculateAgeResults(assets) でDB取得+計算
  → ageBasedResult に格納
  → FutureProjectionCard に描画
```

**関連ファイル**
- `components/FutureProjectionCard.tsx`（新規）
- `app/(tabs)/index.tsx`

---

## 2026-04-05

### 資産編集機能の実装

**背景**
`AssetCard` をタップすると「編集」が選べるが、`handleEditAsset` が `Alert.alert('開発中')` を表示するだけだった。

**実装内容**

`AddAssetModal` を編集モード対応に拡張（新規コンポーネントは作らず既存を流用）。

- `initialAsset?: Asset` プロップ追加 → 既存データをフォームに初期入力
- `onUpdate?` プロップ追加 → 編集時の保存先
- 編集モード時: 種別選択を非表示、タイトルが「資産を編集」、ボタンが「更新」
- `useMultipleAssets` の `updateAsset` は元から実装済みだったため、繋ぐだけで完結

`app/(tabs)/index.tsx` の変更:
- `updateAsset` をデストラクチャリングに追加
- `handleEditAsset`: `Alert('開発中')` → `setEditingAsset(asset); setShowAddModal(true)` に変更
- `handleCloseAddModal`: モーダルを閉じる際に `editingAsset` をクリア
- `AddAssetModal` に `onUpdate` / `initialAsset` を渡す

**関連ファイル**
- `components/AddAssetModal.tsx`
- `app/(tabs)/index.tsx`

---

### ペルソナ & マネタイズ戦略の整理

**背景**
「喉から手が出るほど欲しいアプリ」にするための設計見直し。

**結論**

コアペルソナ: **「Excelで老後計算しようとして挫折した27〜34歳の共働きサラリーマン」**

最大の問題: 「将来いくらになるか」がホーム画面から見えない。アプリの核心価値が棚卸しボタンの奥に隠れている。

無料/有料の線引き見直し:
- 現状: 利率カスタマイズを有料に → 逆効果（予測精度が下がる）
- 推奨: 資産数3つ・棚卸し月2回を無料上限、シナリオ比較をPro目玉に

**詳細**: `docs/persona-strategy.md` 参照

---

## 2026-04-04

### 6軸 UI/UX レビュー実施

以下の6軸でアプリ全体をレビュー。

| 軸 | 評価 | 主な課題 |
|----|------|---------|
| First Impression | ★★★☆☆ | アプリ名非表示、将来予測への動線なし |
| Interaction Design | ★★★★☆ | 資産編集が「開発中」Alert、Haptics未実装 |
| Emotional Design | ★★★☆☆ | 資産が「育っている」感がない、カウントアップなし |
| Information Architecture | ★★☆☆☆ | 将来予測がホーム非表示、予算への動線なし |
| Delight & Engagement | ★★☆☆☆ | ゲーミフィケーション皆無、シェア機能なし |
| Accessibility | ★★★☆☆ | 色のみで現金/株式を識別、accessibilityLabel未設定 |

**最優先改善リスト**
1. ホーム画面に「目標年齢時の予測額」を常時表示（毎日開く理由を作る）
2. 利率カスタマイズを無料解放 → 資産数で線引きに変更
3. 予算・目標をホームから直接編集できる導線
4. ~~資産編集の「開発中」Alertを削除~~ → **2026-04-05 完了**

---

### `InventoryButton` の文言変更

「棚卸し」→「**資産を更新**」に変更。

6軸レビューの「First Impression」軸の改善。「棚卸し」は一般ユーザーに伝わりにくいため、動作を直接表す言葉に変更。

**関連ファイル**: `components/InventoryButton.tsx:94`

---

## 未対応（優先度順）

- [x] ホーム画面に将来予測サマリーを常時表示（最優先）
- [ ] 予算・目標をホームから直接編集できる導線
- [ ] 利率カスタマイズを無料解放 & 資産数で線引き変更
- [x] 円/万円 その場切り替えトグル
- [ ] 総資産カードのカウントアップアニメーション
- [ ] 棚卸し完了時の Haptics フィードバック
- [ ] 現金/株式の判別を色+形で（色覚多様性対応）
- [ ] シナリオ比較機能（Pro目玉）
