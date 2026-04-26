import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY_HIDDEN = 'isHidden';

interface DisplayUnitContextValue {
  isHidden: boolean;
  toggleHidden: () => void;
  formatNumberDisplay: (num: number, formatNumber: (n: number) => string) => string;
}

const DisplayUnitContext = createContext<DisplayUnitContextValue>({
  isHidden: false,
  toggleHidden: () => {},
  formatNumberDisplay: (num, formatNumber) => formatNumber(num),
});

export function DisplayUnitProvider({ children }: { children: React.ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_HIDDEN).then((val) => {
      if (val === 'true') setIsHidden(true);
    });
  }, []);

  const toggleHidden = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsHidden((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY_HIDDEN, String(next));
      return next;
    });
  }, []);

  const formatNumberDisplay = useCallback(
    (num: number, formatNumber: (n: number) => string): string => {
      if (isHidden) return '••••••';
      const man = Math.round(num / 1000) / 10;
      return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`;
    },
    [isHidden]
  );

  return (
    <DisplayUnitContext.Provider value={{ isHidden, toggleHidden, formatNumberDisplay }}>
      {children}
    </DisplayUnitContext.Provider>
  );
}

export function useDisplayUnit() {
  return useContext(DisplayUnitContext);
}
