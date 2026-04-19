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
  // Tanao: モノクローム（黒・グレー）基調に変更
  primary: {
    50: '#F9FAFB', // gray50
    100: '#F3F4F6', // gray100
    200: '#E5E7EB', // gray200
    300: '#D1D5DB', // gray300
    400: '#9CA3AF', // gray400
    500: '#111827', // gray900 (メイン: ほぼ黒)
    600: '#000000', // black (強調: 完全な黒)
    700: '#1F2937', // gray800
    800: '#374151', // gray700
    900: '#4B5563', // gray600
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
      50: '#F3F4F6', // gray100
      100: '#E5E7EB', // gray200
      500: '#111827', // gray900
      600: '#000000', // black
      700: '#1F2937', // gray800
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
      primary: '#111827', // 黒に近いグレー
      primaryHover: '#000000', // 黒
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
