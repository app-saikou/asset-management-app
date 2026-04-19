# Tanao 課題・TODO 全リスト

> 最終更新: 2026-04-07
> このファイルで全課題・未対応事項を一元管理する。完了したら `[x]` にして日付を記載。

---

## ✅ 実装済み

| 完了日 | 内容 | 関連ファイル |
|--------|------|-------------|
| 2026-04-04 | `InventoryButton` の文言「棚卸し」→「資産を更新」 | `components/InventoryButton.tsx` |
| 2026-04-05 | 資産編集機能（`AddAssetModal` を編集モード対応に拡張） | `components/AddAssetModal.tsx`, `app/(tabs)/index.tsx` |
| 2026-04-05 | ホーム画面に `FutureProjectionCard`（将来予測サマリー）を常時表示 | `components/FutureProjectionCard.tsx`, `app/(tabs)/index.tsx` |
| 2026-04-05 | 円 / 万円 その場切り替えトグル（AsyncStorage で永続化） | `components/TotalAssetCard.tsx`, `app/(tabs)/index.tsx` |
| 2026-04-05 | `getCurrentAge()` ハードコード30歳 → 生年月日から正確に計算 | `lib/projection.ts`, `hooks/useProjection.ts` |
| 2026-04-05 | 月末通知スキップ（`repeats: true` + 固定日）→ 単発トリガー＋都度再スケジュール方式 | `lib/notifications.ts` |
| 2026-04-05 | 通知日付比較に時刻なし → 時刻込み比較で誤った翌月ジャンプを修正 | `lib/notifications.ts` |
| 2026-04-05 | Picker操作のたびに通知キャンセル→即再スケジュール → 完了ボタン押下時のみ保存 | `app/(tabs)/profile.tsx` |
| 2026-04-05 | ホーム予測カードを `MonthlyProjectionEngine` でオンザフライ計算に統一（予算込み・月次複利） | `hooks/useHomeProjection.ts`（新規）, `app/(tabs)/index.tsx` |
| 2026-04-05 | 万円モード・円モードともに金額を整数表示に統一 | `app/(tabs)/index.tsx`, `hooks/useMultipleAssets.tsx` |
| 2026-04-05 | 通知許可モーダルが通知ON済みユーザーにも毎セッション表示される → `=== null` のみに絞る | `app/(tabs)/index.tsx` |
| 2026-04-06 | `asset_history` 保存時の旧エンジン（年次単利）依存を除去、新エンジン（月次複利）に統一 | `hooks/useAssetHistory.ts`, `app/inventory-step.tsx`, `app/inventory-adjustment.tsx` |
| 2026-04-07 | 通知ON/OFFトグルのUI遅延 → オプティミスティック更新に変更 | `hooks/useNotifications.ts` |
| 2026-04-07 | `AppState` + `useFocusEffect` で通知同期が2重に走る → `useFocusEffect` 削除 | `app/(tabs)/profile.tsx` |
| 2026-04-07 | `scheduleMonthlyNotification` 内で `targetDay`（スコープ外変数）を参照 → `day` に修正 | `lib/notifications.ts` |
| 2026-04-07 | 万円モード1万円未満が `0万` 表示 → 小数1桁（`0.2万`）表示に変更 | `app/(tabs)/index.tsx` |

---

## 🔴 バグ・致命的な問題

### 計算ロジック

- [x] **予測カードに予算（毎月の積立）が反映されていない** ✅ 2026-04-06
  - `calculateAgeBasedResults`（予算なし・年次複利）→ `useHomeProjection`（`MonthlyProjectionEngine`・予算込み・月次複利）に差し替え
  - `calculateAgeBasedResults` はコードベースから完全に除去済み（呼び出し箇所ゼロ）
  - 関連: `hooks/useHomeProjection.ts`（新規）, `app/(tabs)/index.tsx`

- [x] **現在年齢がハードコード30歳** ✅ 2026-04-05
  - `lib/projection.ts` の `MonthlyProjectionEngine.getCurrentAge()` が `return 30` で固定
  - 全ユーザーの計算が30歳ベースになっていた
  - **修正**: コンストラクタに `birthDate` を渡して正確に計算。`useProjection.ts` でプロフィール取得をエンジン生成前に移動

- [x] **年次複利と月次複利の混在** ✅ 2026-04-06
  - `calculateAgeBasedResults`（年次複利）を廃止し、全ての予測計算を `MonthlyProjectionEngine`（月次複利）に統一
  - `calculateAgeBasedResults` の呼び出し箇所はコードベースからゼロになったことを確認済み

### 通知

- [x] **月末通知が2月・4月など31日がない月に発火しない** ✅ 2026-04-05
  - Expo Notifications の `repeats: true` + `day: 31` 固定では2月をスキップ
  - **修正**: `repeats: true` をやめ、単発トリガー（`type: 'date'`）に変更。アプリ起動時に都度次月日付を計算して再スケジュール

- [x] **`calculateNextNotificationDate()` の日付比較に時刻が含まれていない** ✅ 2026-04-05
  - 月末9時通知 → 月末8時に確認すると「今月0時 < 現在8時」で翌月に飛ぶ
  - **修正**: `new Date(year, month-1, targetDay, hour, 0)` で時刻込み比較に変更

- [x] **Picker操作のたびに通知が全キャンセル→再スケジュールされる** ✅ 2026-04-05
  - `profile.tsx` の Picker `onValueChange` で即座に `updateNotificationSettings()` が走る
  - **修正**: `onValueChange` では state 更新のみ。「完了」ボタン押下時のみ `updateNotificationSettings()` を実行

---

## 🟡 高優先度の改善

### 計算・データ

- [x] **`asset_history`（旧）と `monthly_asset_projections`（新）で保存ロジックが違う** ✅ 2026-04-06
  - 履歴は旧エンジン（予算なし）、予測は新エンジン（予算あり）
  - **修正**: `calculateAgeBasedResults` 依存を除去。`annualRate` は加重平均直接計算、`years` は `targetAge - currentAge`、`asset_history_details.future_value` は `monthly_asset_projections` の資産別値を使用

- [ ] **最初の月の複利計算ゼロ問題**
  - 棚卸し実行月は複利なし扱い → 月中実行時に残り日数分の利息が無視される
  - 影響は小さいが誤差になる

### 通知

- [ ] **通知IDがDBに保存されていない**
  - スケジュール後の `notificationId` を `user_profiles` に保存していない
  - 特定通知のキャンセルができず `cancelAllNotifications()` 全消しに依存
  - **修正**: `user_profiles` に `notification_id` カラム追加 + 保存

- [x] **通知許可モーダルが通知ONのユーザーにも毎セッション表示される** ✅ 2026-04-05
  - `profile?.notification_enabled !== false` の条件が広すぎて `true`（ON済み）も含んでいた
  - **修正**: `notification_enabled === null`（未設定のみ）に絞る

- [x] **`AppState` と `useFocusEffect` で同じ同期処理が2重に走る** ✅ 2026-04-07
  - `profile.tsx` でどちらも同一の `updateNotificationSettings()` を呼ぶ
  - **修正**: `useFocusEffect` を削除。`AppState` のみ残す（iOS設定変更後の復帰に対応するため）

### UI/UX

- [ ] **予算・目標をホームから直接編集できる導線がない**【最優先 / FPレビューでも最重要と評価】
  - 「毎月の積立額を変えたら将来どう変わるか」をすぐ試せることがコアバリュー
  - タブ遷移なしでホームから編集できるシート or インライン編集
  - FP視点: 「じゃあ毎月1万円増やしたら？」を瞬時に見せることが相談価値の核心。現状タップ5回以上かかる → 目標タップ2回

- [ ] **FutureProjectionCardに計算前提が表示されていない**【FPレビュー 工数小】
  - 「この¥2,000万は年利何%の計算？」が分からないとユーザーが数字を信用できない
  - カード下部に「※年利◯%・毎月◯万円積立で試算」を小さく常時表示。タップで編集へ

- [ ] **目標未達時に「次の一手」が提示されていない**【FPレビュー 工数小】
  - 差額だけ見せて終わりは「不安を煽るだけ」でFP的に最悪パターン
  - 「目標まであと¥◯◯」の下に「毎月+1万円追加で◯年短縮」のヒントを1行追加

- [ ] **資産登録時の年利入力ガイドがない**【FPレビュー 工数中】
  - 「年利何%ですか？」に答えられる一般ユーザーは10人中1〜2人
  - 誤入力 → 将来予測が外れる → アプリへの信頼喪失、という最悪パターンのリスク
  - 改善: 資産種別ごとにデフォルト値を設定（現金→0.1%「大手銀行普通預金の平均」、株式→5%「インデックス投資の長期期待値（確定値ではありません）」）
  - 「自分で設定する」で上書き可能に。免責もここ1箇所に集約

- [x] **万円モードで1万円未満を `0.2万` 表示にする** ✅ 2026-04-07
  - 現状: 1万未満は `¥2,000`（円にフォールバック）
  - **修正**: `Math.round(num / 1000) / 10` で小数1桁の万円表示に統一

---

## 🟠 中優先度の改善

### グラフ

- [ ] **将来予測グラフで現金・株式の内訳を色分け表示したい**
  - `monthly_asset_projections` に `asset_type` カラムあり（データは揃っている）
  - **実装方針**:
    1. 月ごとに `cash` / `stock` を集計
    2. `react-native-gifted-charts` の `StackedBarChart` または2本重ねた `LineChart`
    3. 凡例（青=現金 / 緑=株式）を追加
  - DBスキーマ変更不要

### マネタイズ

- [ ] **利率カスタマイズを無料解放し、資産数で線引きに変更**
  - 現状: 利率カスタマイズが有料 → 予測精度が下がって逆効果
  - 推奨: 無料3資産まで / Pro無制限 + シナリオ比較

- [ ] **シナリオ比較機能（Proの目玉）**
  - 「毎月+5万円追加投資したら」を並べて比較
  - 無料期間で体験させて、終了後に「あの数字をまた見たい」でPro課金へ

- [ ] **逆算シミュレーション「目標から必要積立額を計算」**【競合調査より / 工数中】
  - 競合（AM-One等）が提供しているが、Tanaoは「実残高ベース」で計算できる点が差別化
  - 「65歳までに3,000万円貯めたい。毎月いくら積めばいい？」に即答
  - 実装案: FutureProjectionCardボトムシートに目標金額入力欄を追加 → 必要毎月積立額を表示
  - 参考: `docs/competitive-analysis-am-one.md`

### UI

- [ ] **棚卸し完了時の紙吹雪アニメーション**
  - `react-native-confetti-cannon` が定番
  - Haptics（成功バイブ）と同時発火
  - 毎回ではなく「初回 or 連続◯回目」などトリガーを絞る（慣れ防止）
  - アニメーション時間 1.5〜2秒
  - 関連: `ux-redesign-proposal.md` の「棚卸し完了"勝利モーメント"」
- [ ] **総資産カードのカウントアップアニメーション**
- [ ] **棚卸し完了時の Haptics フィードバック**
- [ ] **現金/株式の識別を色+形に（色覚多様性対応）**
  - 内訳ドットが色のみ → 形（丸/四角）も変える
- [ ] **accessibilityLabel 未設定**

---

## 🟢 低優先度・将来の機能

- [ ] **資産タイプの拡充**（不動産、暗号資産、iDeCo、NISAなど）
- [ ] **グラフのシェア機能**（「65歳で◯円！」をSNSに投稿）
- [ ] **FIRE達成年齢の逆算**（「何歳でFIREできる?」を計算）
- [ ] **App Store キーワード最適化**（「老後 シミュレーション」「FIRE 計算」など）
- [ ] **目標達成時のゲーミフィケーション**（バッジ・達成アニメーション）

---

## 🧭 競合調査から見えた中長期の方向性（2026-04-19）

AM-Oneなど既存Webシミュレーターとの比較から、Tanaoの差別化軸は**「実残高ベースの計算」と「履歴が溜まること」**。
詳細: `docs/competitive-analysis-am-one.md`

### 方向A: 逆算シミュレーション【短期・工数小〜中】
- 「目標3,000万円まであと¥2,150万。毎月+3万円で7年縮まる」
- ホーム直編集（最優先タスク）と同時に実装できる延長線上の機能
- AM-Oneも持っているが、Tanaoは**実残高ベース**なので現実感が段違い
- 実装: FutureProjectionCardのボトムシートに目標金額→必要積立額の逆算を追加

### 方向B: 取り崩しモデル【中期・Pro機能】
- 「この積み方だと95歳で資産が尽きます」
- 怖さが行動を促す。AM-Oneも単純モデルは持っているが実残高連動はTanaoだけ
- 実装: 積立フェーズ＋取り崩しフェーズの2段階計算（`user_profiles`に`monthly_withdrawal`追加）

### 方向C: 資産履歴の実績グラフ【短期・工数小〜中】
- 「去年の自分より+◯◯万円」を可視化
- AM-Oneには絶対できない機能。履歴が溜まるTanaoだけの強み
- 継続モチベーションに直結。棚卸しを続ける理由になる

### 推奨: AとCを組み合わせる
- A（逆算）= 「今すぐ使える価値」
- C（実績グラフ）= 「続ける理由」
- 両方揃うことでTanaoのコアバリューが完成する

---

## 💡 将来予測の「現実味」改善

### 背景
複利計算を100歳まで表示すると数億円規模になり、ユーザーが「現実味がない」と感じる。
数学的には正しいが、インフレ無視・取り崩し無視のため直感と乖離する。

### 方針
- 100歳まで表示できる機能自体は維持する
- ただしデフォルトは目標年齢ベースの表示にする（既存動作）
- 以下の機能を段階的に追加して「怖さ」=「動機」を演出する

### 対応項目

- [ ] **インフレ考慮オプション**（🟡 高優先度）
  - インフレ率（デフォルト2%）を設定に追加
  - 実質額 = 名目額 ÷ (1 + インフレ率)^年数 で換算
  - 「今日のお金に換算すると ¥XX万」を予測カードに併記
  - 設定: `user_profiles` に `inflation_rate` カラム追加（または固定2%から始める）

- [ ] **取り崩しモデルの追加**（🟡 高優先度 / Pro目玉候補）
  - 積立フェーズ（現在〜目標年齢）＋取り崩しフェーズ（目標年齢〜）の2段階計算
  - 「毎月◯万円取り崩すと、資産が尽きるのは何歳か？」を表示
  - 入力: 月次取り崩し額（デフォルト: 現在の月次生活費 or 20万円）
  - 出力: 資産枯渇年齢 / 100歳時点の残資産
  - **コアバリュー**: 「3億あっても95歳で尽きる」という怖さが行動を促す
  - DBスキーマ: `user_profiles` に `monthly_withdrawal` カラム追加
  - 競合（AM-One）は「毎月均等取り崩し」の単純モデルのみ。Tanaoは実残高連動で差別化できる
  - 参考: `docs/competitive-analysis-am-one.md`

### 設計メモ
```
現状（名目のみ）:
  資産 × (1 + 利率)^年数 → 100歳時に数億円 → 現実味なし

改善後（2段階モデル）:
  積立フェーズ: 月次複利 + 毎月の積立
  取り崩しフェーズ: 月次複利 - 毎月の取り崩し
  インフレ調整: 上記結果 ÷ (1 + インフレ率)^年数
  → 「何歳で尽きるか」が一目で分かる
```

---

## 設計方針メモ

### コアペルソナ
> 「Excelで老後計算しようとして挫折した27〜34歳の共働きサラリーマン」
> 詳細: `docs/persona-strategy.md`

### 計算エンジン統一方針
```
現状（問題あり）:
  ホーム予測カード → calculateAgeBasedResults（予算なし・年次複利）
  棚卸し後グラフ  → MonthlyProjectionEngine（予算あり・月次複利）

目標（統一後）:
  すべての予測 → MonthlyProjectionEngine の結果（target_age_snapshots / monthly_asset_projections）
  棚卸し後に計算、DBに保存、各画面はDBから取得するだけ
```

### 通知スケジュール方針
```
現状（問題あり）:
  Expo Notifications の repeats: true + 固定日 → 月末に非対応

目標:
  毎月の通知は手動再スケジュール方式
  発火後 → 次月の通知をスケジュール → 繰り返し
  通知IDをDBに保存して管理
```
