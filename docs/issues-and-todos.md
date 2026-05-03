# Tanao 課題・TODO 全リスト

> 最終更新: 2026-05-01
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
| 2026-05-01 | グラフY軸バグ修正：マイナス値を `chartOffset` でシフトして gifted-charts の座標系を非負に保つ。Y軸ラベルは実値（マイナス含む）を表示。¥0ラインを参照線で可視化 | `app/history-detail.tsx` |
| 2026-05-01 | 表・テーブルのマイナス値表示修正：`formatCurrency` / `formatNumber` をマイナス対応に変更（旧: 0にクランプ → 新: `-¥○○万` 表示） | `app/history-detail.tsx`, `hooks/useAssetHistory.ts` |
| 2026-05-01 | ログインループ修正：匿名ユーザーが `login.tsx` で `/auth/signup` にリダイレクトされ無限ループ → 非匿名ユーザーのみホームへ遷移 | `app/auth/login.tsx` |
| 2026-05-01 | テーブル年齢列の改行修正：`tableAgeCell` の幅を 100→120px に拡大、`numberOfLines={1}` を追加 | `app/history-detail.tsx` |
| 2026-05-01 | グラフデフォルト表示を「目標年齢まで」に変更：`showFullRange` state と `visibleChartPoints` で切り替え。「全期間を表示」ボタンで全期間も確認可能 | `app/history-detail.tsx` |
| 2026-05-03 | アプリ起動時の通知再スケジュール処理を追加：`notification_enabled` かつ許可 `granted` なら `scheduleMonthlyNotification` を1回実行。1回限り通知が次月以降も継続する | `app/_layout.tsx` |

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

- [x] **月末通知が2月・4月など31日がない月に発火しない** ✅ 2026-04-05（再スケジュール実装: 2026-05-03）
  - Expo Notifications の `repeats: true` + `day: 31` 固定では2月をスキップ
  - **修正**: `repeats: true` をやめ、単発トリガー（`type: 'date'`）に変更。アプリ起動時に都度次月日付を計算して再スケジュール（`app/_layout.tsx` に実装済み）

- [x] **`calculateNextNotificationDate()` の日付比較に時刻が含まれていない** ✅ 2026-04-05
  - 月末9時通知 → 月末8時に確認すると「今月0時 < 現在8時」で翌月に飛ぶ
  - **修正**: `new Date(year, month-1, targetDay, hour, 0)` で時刻込み比較に変更

- [x] **Picker操作のたびに通知が全キャンセル→再スケジュールされる** ✅ 2026-04-05
  - `profile.tsx` の Picker `onValueChange` で即座に `updateNotificationSettings()` が走る
  - **修正**: `onValueChange` では state 更新のみ。「完了」ボタン押下時のみ `updateNotificationSettings()` を実行

---

## 🔴 バグ・致命的な問題（追加 2026-04-27）

### パフォーマンス

- [x] **資産更新後のグラフ表示まで待ち時間がある** ✅ 2026-04-29
  - グラフ・アクティブポイントカードにスケルトンUI追加（バン！と出現する問題を解消）
  - 資産別残高クエリをN+1→バッチ（`.in()`）に変更してクエリ回数削減
  - 広告表示中にsave計算を並列実行し、広告後の待ち時間をほぼゼロに短縮
  - 関連: `app/history-detail.tsx`, `app/inventory-step.tsx`

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

- [ ] **通知IDがDBに保存されていない**（低優先・将来の改善）
  - スケジュール後の `notificationId` を `user_profiles` に保存していない
  - 特定通知のキャンセルができず `cancelAllNotifications()` 全消しに依存
  - 現状の設計（全消し→再作成）では実害なし。個別キャンセルが必要になれば対応
  - **修正案（将来）**: `user_profiles` に `notification_id TEXT NULL` カラム追加 + 保存

- [x] **通知許可モーダルが通知ONのユーザーにも毎セッション表示される** ✅ 2026-04-05
  - `profile?.notification_enabled !== false` の条件が広すぎて `true`（ON済み）も含んでいた
  - **修正**: `notification_enabled === null`（未設定のみ）に絞る

- [x] **`AppState` と `useFocusEffect` で同じ同期処理が2重に走る** ✅ 2026-04-07
  - `profile.tsx` でどちらも同一の `updateNotificationSettings()` を呼ぶ
  - **修正**: `useFocusEffect` を削除。`AppState` のみ残す（iOS設定変更後の復帰に対応するため）

### フィードバック・評価

- [ ] **アプリ内フィードバック導線**
  - メール / フォームへのリンクをプロフィール画面に追加
  - App Store レビューへの誘導も含む

- [ ] **評価依頼（SKStoreReviewRequest）**
  - 適切なタイミングで `StoreReview.requestReviewAsync()` を呼ぶ
  - タイミング案: 資産更新3回目 / ストリーク3ヶ月達成時など
  - 同一セッションで複数回リクエストしないよう `AsyncStorage` でフラグ管理

### バージョン管理

- [ ] **強制バージョンアップ制御**
  - 古いバージョンのユーザーに更新を促す仕組み
  - 実装案: Supabase の設定テーブルに `min_required_version` を持つ → 起動時チェック → 古い場合はApp Storeへ誘導するモーダル表示
  - 強制度: 重大バグ修正時は強制（閉じられない）、通常時はスキップ可

### 通知許可モーダル

- [x] **`undetermined` 状態を `false` として保存してしまうバグ** ✅ 2026-05-02
  - `assets.tsx`: ATT許可状態が `undetermined` のとき `notification_enabled: false` を保存
  - **修正済み**: `undetermined` の場合は DB 更新せずモーダルを閉じるだけに変更（line 403-406）

- [x] **ATT → 通知の2連続ダイアログ体験の改善** ✅ 2026-05-03
  - ATT決定済みユーザーにも固定500ms待機が入っていた
  - **修正**: ATTリクエスト前に `getTrackingPermissionsAsync()` で状態確認。`not-determined`（初回）なら1500ms待機、決定済みなら待機ゼロ

### オンボーディング

> **設計方針（確定）**
> - ステップ構成は4つのまま維持（Step1: 名前・年齢 / Step2: 現金・株式 / Step3: 収入・支出・投資 / Step4: 目標年齢・目標額）
> - Step4（目標年齢・目標額）は計算・グラフに必要なため維持
> - スキップ機能は作らない（入力UXを改善して不要にする方針）
> - 計算に最低限必要なのは「年齢・現在資産・収支・投資額・目標年齢・目標額」

**実装済み**
- [x] HorizontalScrollPicker 導入（Step2・3・4のスライダーを横スクロールピッカーに置換） ✅ 2026-04-30
- [x] Step2 刻み幅を 50万円 → 20万円に変更 ✅ 2026-04-30
- [x] ピッカー中央アイテムのzIndexバグ修正・枠幅を 80→96px に拡大 ✅ 2026-04-30
- [x] 値表示の「ボタンっぽさ」除去 — border/背景色を削除（Step1〜4全ステップ） ✅ 2026-04-30
- [x] 年齢表示を「XX歳Xヶ月」に変更（Step1） ✅ 2026-04-30
- [x] Dev用オンボーディングリセットボタン（プロフィール画面、`__DEV__` 限定） ✅ 2026-04-30

**残タスク**

- [ ] **Step3 制約ロジック削除**
  - 現状: 収入・支出・投資が相互依存（収入 ≥ 支出＋投資を常に強制）→ 一方を変えると他が自動変化して混乱
  - 改善: 3項目を完全に独立入力にする。制約ロジックをすべて削除
  - 「収入 < 支出＋投資」になっても入力時には怒らない
  - 関連: `components/onboarding/OnboardingStep3.tsx`

- [ ] **計算エンジン改修: 現金がゼロ以下になったら投資を停止**
  - 現状: `lib/projection.ts` の計算にゼロクランプがなく、現金がマイナスになっても投資が継続される
  - 問題: 「収入 < 支出＋投資」の設定にすると現金が無限にマイナスになり、現実と乖離した結果が出る
  - 改善: `calculateContribution()` 内で、現金残高が0未満になる場合は投資 contribution を0に抑える
  - 関連: `lib/projection.ts`

- [ ] **戻ったときの遅延解消**
  - 現状: 戻るボタンでステップが再マウントされると `currentStep` 変化を検知して DBフェッチ（`fetchAssets()` / `refetch()`）が走り、値の復元が遅い
  - 改善: `currentStep` 変化時のDBフェッチ＋`isInitialized`リセットを削除。親（`onboarding.tsx`）の `state.data` から即座に復元する設計に統一
  - 関連: `components/onboarding/OnboardingStep2.tsx`, `OnboardingStep3.tsx`, `app/onboarding.tsx`

- [ ] **ウェルカム画面のロゴ縮小**
  - 現状: `width={300} height={300}` で大きすぎる
  - 改善: 180前後に縮小
  - 関連: `components/onboarding/OnboardingWelcome.tsx`

### 通知

- [ ] **通知が実際に届いているか未確認**
  - コードは実装済みだが、TestFlight / 実機での動作確認が取れていない
  - 確認項目: ① 指定日時に通知が届くか ② アプリを再起動したとき次月の通知が再スケジュールされるか ③ 通知からアプリを開いたときの遷移先

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

- [x] **万円固定表示に変更（円/万円トグル廃止）** ✅ 2026-04-21
  - DisplayUnitContext から `displayInMan` / `toggleUnit` を削除、常に万円表示
  - 少額ユーザーへの影響は軽微（ターゲット層は数百万〜数千万円帯）

- [x] **isHidden（資産非表示）を永続化** ✅ 2026-04-21
  - AsyncStorage `isHidden` キーに保存。アプリ再起動後も維持

- [x] **万円モードで1万円未満を `0.2万` 表示にする** ✅ 2026-04-07
  - 現状: 1万未満は `¥2,000`（円にフォールバック）
  - **修正**: `Math.round(num / 1000) / 10` で小数1桁の万円表示に統一

---

## 🟠 中優先度の改善

### 資産更新画面（UX再設計）

- [ ] **資産アイテムごとの画面遷移を見直す**
  - 現状: 資産1件ずつ別画面（スタック遷移）で金額を入力する
  - 課題: 資産が複数あると画面遷移が多くなり、全体の流れが掴みにくい
  - 検討方向: 全資産を1画面にまとめてスクロール入力 / ボトムシートでのインライン編集 / ステッパー形式（画面数を減らす）など
  - 参考にしたい体験: 家計簿アプリの一括入力、銀行アプリの振込フロー

### 資産推移グラフ（デザイン・表示改善）

- [x] **デフォルト表示範囲を「目標年齢まで」に変更** ✅ 2026-05-01
  - 初期表示を目標年齢の時点までにトリム。「全期間を表示」ボタンで全期間も確認可能
  - 目標年齢未設定の場合は全期間表示にフォールバック

- [ ] **グラフのデザイン改善**
  - 現状のデザインで気になる点を整理して改善案を検討する
  - 候補: Y軸ラベルの見やすさ、グラフの色・線の太さ、目標ライン（点線）の強調度合いなど

### グラフ

- [ ] **履歴画面カードに全履歴スパークラインを埋め込む**
  - 各カードの右側に `current_assets` の推移を小さな折れ線グラフで表示
  - `history` 配列（日付順ソート）を各カードに渡し、`react-native-svg` で描画
  - 前提: 履歴データが十分に蓄積されてから実装する価値が出る（棚卸し実績が少ないと線が短い）
  - 現状の2点ライン（現在→目標年齢）は意味が薄いため削除済み。このTODO実施まで右側は空欄

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

- [x] **「万」を数字より小さく表示（ホーム画面）** ✅ 2026-04-21
  - heroAmount(60px)→万28px、projectionAmount(44px)→万20px
  - 数字が主役・単位が補足という視覚階層を実現

- [x] **TotalAssetCard を全面リニューアル** ✅ 2026-04-22
  - 総資産: 32px → 48px + 万分割（22px）+ tabular-nums
  - 内訳ドット → 水平帯グラフ1本（黒=現金 / アンバー=株式）
  - 最終更新日時を時計アイコン付きで右上に表示（例: 4/1 14:30）
  - `isHidden` 対応をコンポーネント内部に組み込み

- [x] **資産画面タブ廃止 → 縦並びスクロール** ✅ 2026-04-22
  - 現金/株式タブを削除し、両セクションを縦に並べて全資産を一覧表示
  - グローバル＋ボタンを廃止、各セクションヘッダーに「追加」ボタンを設置
  - セクションヘッダーにアイコン追加（現金=Banknote / 株式=BarChart3）

- [x] **AssetCard をリスト行形式に軽量化** ✅ 2026-04-22
  - 個別カード（シャドウ・ボーダー）→ 行+区切り線形式
  - AssetSectionCard がコンテナ（角丸ボーダー）で囲む iOS グループリスト形式
  - 金額を右揃え・tabular-nums 適用

- [x] **アイコンをセクションヘッダーへ移動** ✅ 2026-04-22
  - 各行に同じアイコンが並ぶノイズを解消
  - 資産ごとのアイコンカスタマイズは将来対応

- [ ] **`¥` を数字の70%サイズで表示**
  - 大きい数字の前の¥記号が同サイズだと重い。heroAmount・projectionAmountに適用

- [ ] **負の数は赤色で表示**
  - 資産減少時などの数字に `color: red` を適用

- [ ] **非表示トグルにHaptic Feedbackを追加**
  - `expo-haptics` の `impactAsync(ImpactFeedbackStyle.Light)` を `toggleHidden` 呼び出し時に発火

- [ ] **数字更新時フェードインアニメーション**
  - 画面フォーカス時の資産再取得後、数字がフェードインで切り替わる

- [ ] **プログレスバーのfillアニメーション化**
  - `Animated.Value` で幅を0→実値にスプリングアニメーション

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

## 🟠 中優先度の改善（追加 2026-04-27）

### 資産推移グラフ

- [ ] **資産推移グラフの改善**
  - タイムライン（一覧）はあるが、時系列グラフがない
  - 課題: 「資産が増えている実感」を視覚的に伝えられていない
  - 改善方針: 履歴画面に総資産の折れ線グラフを追加（`react-native-gifted-charts` の LineChart）
  - データ: `asset_history.current_assets` を日付順に並べるだけで実装可能
  - 参考: `docs/competitive-analysis-am-one.md` の方向C（実績グラフ）

### 外観・国際化

- [ ] **ダークモード対応**
  - 現在 `app.json` の `userInterfaceStyle: "light"` で明示的に無効化
  - `Colors` トークンはすでに `semantic` 設計になっているため対応しやすい構造
  - 対応方針: `useColorScheme()` で色を切り替え、`Colors` に `dark` テーマを追加
  - 工数: 大（全画面の色確認が必要）

- [ ] **多言語対応（UI の英語化）**
  - App Store 説明文は英語対応済みだが、アプリUI自体は日本語固定
  - 対応方針: `i18n-js` または `expo-localization` + JSONファイルで文言管理
  - 優先言語: 英語（en）のみで十分（ターゲット市場は日本だが海外ユーザー対応）
  - 工数: 大（全文言の抽出・翻訳が必要）

## 🟢 低優先度・将来の機能

### タイムライン画面の拡張（timeline_events テーブル方式）

> 設計検討日: 2026-05-03  
> 現状: 一括資産更新（棚卸し）のみ `asset_history` に記録される  
> 目的: 予算変更・目標更新・マイルストーン達成なども1本のタイムラインに表示する

#### 設計方針: アプローチB（別テーブル）を採用

`asset_history` には手を加えず、新規テーブル `timeline_events` を追加する。

```
asset_history（既存・継続使用）
  └─ 棚卸しの記録専用
     current_assets / future_value / annual_rate / years
     asset_history_details で各資産の内訳も保持

timeline_events（新規追加）
  └─ 棚卸し以外の出来事
     id, user_id, event_type, title, metadata (JSONB), created_at
```

**event_type の種別（将来追加分含む）**:
- `milestone`     → metadata: `{ threshold: 10000000, achieved: 10500000 }`
- `budget_change` → metadata: `{ before: 30000, after: 50000 }`
- `goal_update`   → metadata: `{ field: "target_age", before: 65, after: 60 }`
- `asset_edit`    → metadata: `{ asset_name: "SBI証券", before: 500000, after: 620000 }`
- `streak`        → metadata: `{ months: 12 }`（将来）
- `subscription`  → metadata: `{ plan: "pro" }`（将来）

**なぜ A（asset_history に event_type 追加）ではなく B か**:
- Aは `current_assets / future_value` 等がNULLになるレコードが生まれ型安全が崩れる
- Bはイベント種別を増やす際にテーブル定義変更不要。`event_type` の値を増やすだけ

#### タイムライン表示（表示ロジックのイメージ）

```typescript
const timeline = [
  ...asset_history.map(h => ({ ...h, kind: 'inventory' })),
  ...timeline_events.map(e => ({ ...e, kind: 'event' })),
].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
// kind で分岐して描画。棚卸しカードは現行デザインを維持
```

表示例:
```
5月3日  📊 棚卸し：総資産 850万円       ← asset_history
        🎯 目標年齢を65歳→60歳に変更    ← timeline_events

4月15日 📊 棚卸し：総資産 820万円       ← asset_history
        💰 予算を月3万円→5万円に変更    ← timeline_events

3月1日  🎉 総資産800万円達成！          ← timeline_events
        📊 棚卸し：総資産 800万円       ← asset_history
```

#### 既存ユーザーへの影響

- `asset_history` は変更なし → 既存データ・既存画面に影響ゼロ
- `timeline_events` は新規テーブルのため、アップデート前のイベントは空欄（仕様）
- INSERT 失敗がコア機能（予算保存など）に影響しないよう副作用として実装（`try/catch` で囲む）
- RLS（`user_id = auth.uid()`）を最初から設定する

#### 実装スコープ（4フェーズ）

| フェーズ | 内容 | 難易度 |
|---|---|---|
| 1. DB | `timeline_events` テーブル追加（SQL migration + RLS） | ★☆☆ |
| 2. 書き込み | `budget-edit.tsx` / プロフィール更新 / 資産個別編集の保存時に INSERT | ★☆☆ |
| 3. マイルストーン | 棚卸し完了後に総資産の閾値チェック → 達成時に INSERT | ★★☆ |
| 4. 表示 | `history.tsx` で両テーブルをマージしてレンダリング（新コンポーネント） | ★★★ |

- [ ] **フェーズ1: `timeline_events` テーブル作成**（SQL migration）
- [ ] **フェーズ2: 各編集画面でのイベント書き込み**（budget_change / goal_update / asset_edit）
- [ ] **フェーズ3: マイルストーン判定ロジック**（棚卸し後に閾値チェック）
- [ ] **フェーズ4: タイムライン画面の統合表示**（history.tsx のUI改修）

---

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
