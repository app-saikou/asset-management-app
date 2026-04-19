// オンボーディング機能用の型定義

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  component: string;
  isRequired: boolean;
}

export interface OnboardingData {
  // Step 1: 名前設定
  name: string;

  // Step 2: 生年月日設定
  birthDate: string;

  // Step 3: 現金資産設定
  cashAsset: {
    name: string;
    amount: number;
  };

  // Step 4: 株式資産設定
  stockAsset: {
    name: string;
    amount: number;
  };

  // Step 5: 目標年齢設定
  targetAge: number;

  // Step 4: 目標資産額設定
  targetAmount: number;

  // Step 6: 収入設定
  income: {
    name: string;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
  };

  // Step 7: 支出設定
  expense: {
    name: string;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
  };
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  data: Partial<OnboardingData>;
  isLoading: boolean;
  error: string | null;
}

export interface OnboardingResult {
  success: boolean;
  message: string;
  data?: any;
}
