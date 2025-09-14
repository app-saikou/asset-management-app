// 70%：25%：5%ルールに基づくカラーパレット

export const Colors = {
  // ベース色 (70%) - 背景、テキスト、境界線など
  base: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },

  // アクセント色 (25%) - ブランドカラー、ナビゲーション
  primary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // メインのブランドカラー
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  // 強調色 (5%) - CTA、エラー、成功など
  accent: {
    // 成功
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
    },

    // エラー
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
    },

    // 警告
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
    },

    // 情報
    info: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
    },
  },

  // セマンティックカラー
  semantic: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    border: '#E5E7EB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    button: {
      primary: '#0EA5E9',
      primaryHover: '#0284C7',
      secondary: '#F3F4F6',
      secondaryHover: '#E5E7EB',
    },
  },
} as const;

// カラーパレット使用例
export const ColorUsage = {
  // 70% - ベース色の使用例
  backgrounds: Colors.base.white,
  surfaces: Colors.base.gray50,
  borders: Colors.base.gray200,
  textPrimary: Colors.base.gray900,
  textSecondary: Colors.base.gray500,

  // 25% - アクセント色の使用例
  brandPrimary: Colors.primary[500],
  brandSecondary: Colors.primary[100],
  navigation: Colors.primary[600],

  // 5% - 強調色の使用例
  ctaButton: Colors.accent.success[500],
  errorState: Colors.accent.error[500],
  warningState: Colors.accent.warning[500],
} as const;
