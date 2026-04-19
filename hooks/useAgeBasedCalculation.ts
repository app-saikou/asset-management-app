import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  getUserCurrentAge,
  getUserCalculationAges,
  addCalculationAge,
  removeCalculationAge,
  updateCalculationAge,
  reorderCalculationAges,
  canAddCalculationAge,
  getUserCalculationAgesCount,
  calculateAgeBasedResults,
} from '../lib/ageBasedCalculation';
import { useSubscription } from './useSubscription';
import { useInterestRates } from './useSubscription';
import { AGE_LIMITS, MIN_AGE, MAX_AGE } from '../types/ageBasedCalculation';
import type {
  UserProfile,
  CalculationAgeDisplay,
  AgeCalculationResult,
  CreateUserProfileData,
} from '../types/ageBasedCalculation';
import type { AssetType } from '../types/subscription';

// ユーザープロフィール管理用のHook
interface UseUserProfileReturn {
  profile: UserProfile | null;
  currentAge: number | null;
  isLoading: boolean;
  error: string | null;
  createProfile: (data: CreateUserProfileData) => Promise<void>;
  updateProfile: (data: CreateUserProfileData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentAge, setCurrentAge] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setCurrentAge(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [profileData, ageData] = await Promise.all([
        getUserProfile(user.id),
        getUserCurrentAge(user.id),
      ]);

      setProfile(profileData);
      setCurrentAge(ageData);
    } catch (err: any) {
      setError(err.message || 'プロフィールの取得に失敗しました');
      setProfile(null);
      setCurrentAge(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const createProfile = useCallback(
    async (data: CreateUserProfileData) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');

      try {
        const newProfile = await createUserProfile(user.id, data);
        setProfile(newProfile);

        // 年齢も再取得
        const age = await getUserCurrentAge(user.id);
        setCurrentAge(age);
      } catch (err: any) {
        setError(err.message || 'プロフィールの作成に失敗しました');
        throw err;
      }
    },
    [user?.id]
  );

  const updateProfile = useCallback(
    async (data: CreateUserProfileData) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');

      try {
        const updatedProfile = await updateUserProfile(user.id, data);
        setProfile(updatedProfile);

        // 年齢も再取得
        const age = await getUserCurrentAge(user.id);
        setCurrentAge(age);
      } catch (err: any) {
        setError(err.message || 'プロフィールの更新に失敗しました');
        throw err;
      }
    },
    [user?.id]
  );

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    currentAge,
    isLoading,
    error,
    createProfile,
    updateProfile,
    refreshProfile,
  };
}

// 年齢ベース計算設定管理用のHook
interface UseCalculationAgesReturn {
  ages: CalculationAgeDisplay[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean;
  maxCount: number;
  currentCount: number;
  addAge: (
    targetAge: number,
    targetMonth: number,
    targetAmount?: number | null
  ) => Promise<void>;
  removeAge: (id: string) => Promise<void>;
  updateAge: (
    id: string,
    targetAge: number,
    targetMonth: number,
    targetAmount?: number | null
  ) => Promise<void>;
  reorderAges: (newOrder: CalculationAgeDisplay[]) => Promise<void>;
  calculateResults: (
    assets: Array<{ type: AssetType; amount: number; annualRate?: number }>
  ) => Promise<AgeCalculationResult>;
}

export function useCalculationAges(): UseCalculationAgesReturn {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { rates } = useInterestRates();
  const [ages, setAges] = useState<CalculationAgeDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canAddMore, setCanAddMore] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);

  const maxCount = isPro ? AGE_LIMITS.pro : AGE_LIMITS.free;

  const fetchAges = useCallback(async () => {
    if (!user?.id) {
      setAges([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [fetchedAges, count] = await Promise.all([
        getUserCalculationAges(user.id),
        getUserCalculationAgesCount(user.id),
      ]);

      if (__DEV__) {
        console.log('[useAgeBasedCalculation] fetchedAges:', fetchedAges);
        fetchedAges.forEach((age) => {
          console.log(
            `[useAgeBasedCalculation] age: ${age.target_age}歳${age.target_month}ヶ月, target_amount: ${age.target_amount}`
          );
        });
      }

      setAges(fetchedAges);
      setCurrentCount(count);
      setCanAddMore(count < maxCount);
    } catch (err: any) {
      setError(err.message || '年齢設定の取得に失敗しました');
      setAges([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isPro, maxCount]);

  useEffect(() => {
    fetchAges();
  }, [fetchAges]);

  const addAge = useCallback(
    async (
      targetAge: number,
      targetMonth: number,
      targetAmount?: number | null
    ) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');

      // 年齢の妥当性チェック
      if (targetAge < MIN_AGE || targetAge > MAX_AGE) {
        throw new Error(
          `年齢は${MIN_AGE}歳から${MAX_AGE}歳の間で設定してください。`
        );
      }

      if (targetMonth < 0 || targetMonth > 11) {
        throw new Error('月は0から11の間で設定してください。');
      }

      await addCalculationAge(user.id, targetAge, targetMonth, targetAmount);
      await fetchAges();
    },
    [user?.id, fetchAges]
  );

  const removeAge = useCallback(
    async (id: string) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');
      await removeCalculationAge(user.id, id);
      await fetchAges();
    },
    [user?.id, fetchAges]
  );

  const updateAge = useCallback(
    async (
      id: string,
      targetAge: number,
      targetMonth: number,
      targetAmount?: number | null
    ) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');

      // 年齢の妥当性チェック
      if (targetAge < MIN_AGE || targetAge > MAX_AGE) {
        throw new Error(
          `年齢は${MIN_AGE}歳から${MAX_AGE}歳の間で設定してください。`
        );
      }

      if (targetMonth < 0 || targetMonth > 11) {
        throw new Error('月は0から11の間で設定してください。');
      }

      await updateCalculationAge(
        user.id,
        id,
        targetAge,
        targetMonth,
        targetAmount
      );
      await fetchAges();
    },
    [user?.id, fetchAges]
  );

  const reorderAges = useCallback(
    async (newOrder: CalculationAgeDisplay[]) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');
      setAges(newOrder); // Optimistic update
      try {
        await reorderCalculationAges(user.id, newOrder);
      } catch (err: any) {
        setError(err.message || '年齢設定の並び替えに失敗しました');
        await fetchAges(); // Revert on error
      }
    },
    [user?.id, fetchAges]
  );

  const calculateResults = useCallback(
    async (
      assets: Array<{ type: AssetType; amount: number; annualRate?: number }>
    ) => {
      if (!user?.id) throw new Error('ユーザーが認証されていません。');
      return await calculateAgeBasedResults(user.id, assets, rates);
    },
    [user?.id, rates]
  );

  return {
    ages,
    isLoading,
    error,
    canAddMore,
    maxCount,
    currentCount,
    addAge,
    removeAge,
    updateAge,
    reorderAges,
    calculateResults,
  };
}
