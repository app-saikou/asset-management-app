# 予算機能の計算ロジック

## 概要

予算機能は、ユーザーが設定した収入・支出・投資の予算期間（`user_budget_periods`）に基づいて、将来の資産残高を月次で予測計算する機能です。各月の予算が資産に与える影響（貢献額）を計算し、複利計算と組み合わせて資産残高を予測します。

## データ構造

### 予算期間（`user_budget_periods`）

```typescript
interface UserBudgetPeriod {
  id: string;
  user_id: string;
  type: 'income' | 'expense' | 'investment';
  name: string;
  start_date: string; // YYYY-MM-DD形式
  end_date: string; // YYYY-MM-DD形式
  monthly_amount: number; // 月額（正の値）
  source_asset_id?: string; // 支出・投資の元資産
  target_asset_id?: string; // 収入・投資の先資産
  is_pro_only: boolean;
}
```

### 予算タイプと資産の関係

| タイプ               | `source_asset_id` | `target_asset_id`  | 動作                         |
| -------------------- | ----------------- | ------------------ | ---------------------------- |
| `income`（収入）     | `null`            | 必須               | 指定資産に月額を**加算**     |
| `expense`（支出）    | 必須              | `null`             | 指定資産から月額を**減算**   |
| `investment`（投資） | 必須              | 必須（異なる資産） | 元資産から減算、先資産に加算 |

## 計算の流れ

### 1. 予算期間の取得

計算実行時（棚卸し完了時など）に、ユーザーの予算期間データを取得します。

```typescript
// hooks/useProjection.ts
const { data: periodsData } = await supabase
  .from('user_budget_periods')
  .select('*')
  .eq('user_id', user.id);
```

### 2. 月次予測計算の実行

`MonthlyProjectionEngine`クラスを使用して、各月の資産残高を計算します。

```typescript
const engine = new MonthlyProjectionEngine(
  user.id,
  assets, // 資産データ
  budgetPeriods, // 予算期間データ
  calculationDate // 計算実行日
);
```

### 3. 各月の計算ステップ

#### ステップ 1: 貢献額の計算（`calculateContribution`）

各資産に対して、その月に適用される予算の貢献額を計算します。

```typescript
private calculateContribution(assetId: string, monthYear: string): number
```

**計算ロジック：**

1. **給料日の計算**

   - `start_date`の「日」部分を給料日として使用
   - 例：`start_date = 2026-01-18` → 毎月 18 日が給料日
   - 月末を超える場合は、その月の最終日を使用
     - 例：2 月で給料日が 31 日の場合 → 2 月 28 日（うるう年は 29 日）

2. **期間チェック**

   - その月の給料日が`start_date`以上かつ`end_date`以下かチェック
   - 期間外の場合は貢献額 0

3. **未来チェック**

   - その月の給料日が計算実行日より未来かチェック
   - 過去の給料は既に現在資産に反映済みのため、予測計算には含めない

4. **貢献額の加算・減算**
   - `income` + `target_asset_id === assetId` → `+monthly_amount`
   - `expense` + `source_asset_id === assetId` → `-monthly_amount`
   - `investment` + `source_asset_id === assetId` → `-monthly_amount`
   - `investment` + `target_asset_id === assetId` → `+monthly_amount`

**例：**

```typescript
// 予算期間1: 収入 月額300,000円 → 現金資産
// start_date: 2026-01-18, end_date: 2026-12-31
// 予算期間2: 支出 月額200,000円 → 現金資産から
// start_date: 2026-01-18, end_date: 2026-12-31
// 予算期間3: 投資 月額100,000円 → 現金から株式へ
// start_date: 2026-01-18, end_date: 2026-12-31

// 2026年2月の現金資産への貢献額
// = +300,000 (収入) - 200,000 (支出) - 100,000 (投資)
// = 0円

// 2026年2月の株式資産への貢献額
// = +100,000 (投資)
```

#### ステップ 2: 複利計算（`calculateMonthProjection`）

貢献額を加えた残高に対して、月次複利を適用します。

```typescript
// 最初の月（開始月）
balance = previousBalance + contribution

// 2月目以降
balance = (previousBalance + contribution) × (1 + annualRate / 12)
```

**計算式：**

```
B_j(m) = (B_j(m-1) + contrib_j(m)) × (1 + rate_j(m) / 12)
```

- `B_j(m)`: 資産 j の m 月目の残高
- `B_j(m-1)`: 前月の残高
- `contrib_j(m)`: m 月目の貢献額
- `rate_j(m)`: 年利率（12 で割って月利率に変換）

**例：**

```typescript
// 現金資産: 初期残高3,000,000円、年利率0%
// 株式資産: 初期残高3,000,000円、年利率5%

// 2026年1月（最初の月）
// 現金: 3,000,000 + 0 = 3,000,000円（複利なし）
// 株式: 3,000,000 + 100,000 = 3,100,000円（複利なし）

// 2026年2月
// 現金: (3,000,000 + 0) × (1 + 0 / 12) = 3,000,000円
// 株式: (3,100,000 + 100,000) × (1 + 0.05 / 12) = 3,213,333.33円
```

## 計算の実行タイミング

### 1. 棚卸し完了時

棚卸し完了後、最新の資産データと予算期間データを使用して予測計算を実行します。

```typescript
// hooks/useProjection.ts
const calculateAndSaveProjections = async () => {
  // 1. 最新の資産データを取得
  const { data: assetsData } = await supabase
    .from('multiple_assets')
    .select('*')
    .eq('user_id', user.id);

  // 2. 最新の予算期間データを取得
  const { data: periodsData } = await supabase
    .from('user_budget_periods')
    .select('*')
    .eq('user_id', user.id);

  // 3. 予測計算を実行
  const engine = new MonthlyProjectionEngine(...);
  const projections = engine.calculateProjections(startMonth, endMonth);

  // 4. データベースに保存
  await supabase.from('monthly_asset_projections').insert(projections);
};
```

### 2. 予算期間の変更時

予算期間を追加・更新・削除した場合、予測計算を再実行する必要があります（現在は手動実行）。

## 重要な仕様

### 1. 最初の月の扱い

最初の月（計算開始月）は複利計算を適用しません。初期資産額に貢献額を加算するだけです。

```typescript
if (isFirstMonth) {
  finalBalance = balance + contribution;
} else {
  finalBalance = (balance + contribution) × (1 + rate / 12);
}
```

### 2. 過去の給料の除外

計算実行日より過去の給料日は、予測計算に含めません。これは、過去の給料が既に現在資産に反映されているためです。

```typescript
const isFuture = monthSalaryDate > this.calculationDate;
if (isInPeriod && isFuture) {
  // 貢献額を加算
}
```

### 3. 給料日の計算

`start_date`の「日」部分を給料日として使用します。月末を超える場合は、その月の最終日を使用します。

```typescript
const salaryDay = startDate.getDate();
const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
const actualDay = Math.min(salaryDay, lastDayOfMonth);
const monthSalaryDate = new Date(year, month, actualDay);
```

### 4. 複数の予算期間の重複

同じ資産に対して複数の予算期間が適用される場合、すべての貢献額を合算します。

```typescript
let totalContribution = 0;
this.budgetPeriods.forEach((period) => {
  // 各予算期間の貢献額を加算
  totalContribution += contribution;
});
```

## 計算例

### シナリオ

- **現金資産**: 初期残高 3,000,000 円、年利率 0%
- **株式資産**: 初期残高 3,000,000 円、年利率 5%
- **収入**: 月額 300,000 円 → 現金資産（2026-01-18 ～ 2026-12-31）
- **支出**: 月額 200,000 円 → 現金資産から（2026-01-18 ～ 2026-12-31）
- **投資**: 月額 100,000 円 → 現金から株式へ（2026-01-18 ～ 2026-12-31）
- **計算実行日**: 2026-01-17

### 計算結果

| 年月    | 現金残高     | 現金貢献額 | 株式残高        | 株式貢献額  |
| ------- | ------------ | ---------- | --------------- | ----------- |
| 2026-01 | 3,000,000 円 | 0 円       | 3,000,000 円    | 0 円        |
| 2026-02 | 3,000,000 円 | 0 円       | 3,213,333.33 円 | +100,000 円 |
| 2026-03 | 3,000,000 円 | 0 円       | 3,326,875.00 円 | +100,000 円 |
| ...     | ...          | ...        | ...             | ...         |

**注：** 2026 年 1 月は計算実行日（2026-01-17）より未来の給料日（2026-01-18）があるため、1 月の貢献額は 0 円です。2 月以降から貢献額が反映されます。

## データベースへの保存

計算結果は`monthly_asset_projections`テーブルに保存されます。

```typescript
interface MonthlyAssetProjection {
  user_id: string;
  asset_id: string;
  asset_type: 'cash' | 'stock';
  month_year: string; // YYYY-MM-01形式
  balance: number; // 残高
  contribution: number; // 貢献額
  rate: number; // 年利率
  projection_run_id: string; // 計算実行ID
}
```

## トラブルシューティング

### 貢献額が 0 になる場合

1. **期間外**: その月の給料日が`start_date`～`end_date`の範囲外
2. **過去の給料**: その月の給料日が計算実行日より過去
3. **資産 ID の不一致**: `source_asset_id`または`target_asset_id`が資産 ID と一致しない

### 残高が期待値と異なる場合

1. **初期資産額の確認**: `multiple_assets.amount`が正しいか
2. **予算期間の確認**: `user_budget_periods`の設定が正しいか
3. **利率の確認**: `multiple_assets.annual_rate`が正しいか
4. **計算実行日の確認**: 過去の給料が除外されているか

## 関連ファイル

- `lib/projection.ts`: 予測計算エンジン
- `hooks/useProjection.ts`: 予測計算の実行と保存
- `database/budget_projection_schema.sql`: データベーススキーマ
- `types/budget.ts`: TypeScript 型定義
- `lib/budget.ts`: 予算期間の CRUD 操作
