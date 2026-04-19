import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_UNIT = 'displayInMan';

interface DisplayUnitContextValue {
  displayInMan: boolean;
  isHidden: boolean;
  toggleUnit: () => void;
  toggleHidden: () => void;
  formatNumberDisplay: (num: number, formatNumber: (n: number) => string) => string;
}

const DisplayUnitContext = createContext<DisplayUnitContextValue>({
  displayInMan: false,
  isHidden: false,
  toggleUnit: () => {},
  toggleHidden: () => {},
  formatNumberDisplay: (num, formatNumber) => formatNumber(num),
});

export function DisplayUnitProvider({ children }: { children: React.ReactNode }) {
  const [displayInMan, setDisplayInMan] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_UNIT).then((val) => {
      if (val === 'true') setDisplayInMan(true);
    });
  }, []);

  const toggleUnit = useCallback(() => {
    setDisplayInMan((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY_UNIT, String(next));
      return next;
    });
  }, []);

  // 非表示はセッション限り（再起動で戻る）
  const toggleHidden = useCallback(() => {
    setIsHidden((prev) => !prev);
  }, []);

  const formatNumberDisplay = useCallback(
    (num: number, formatNumber: (n: number) => string): string => {
      if (isHidden) return '••••••';
      if (displayInMan) {
        const man = Math.round(num / 1000) / 10;
        return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`;
      }
      return formatNumber(num);
    },
    [displayInMan, isHidden]
  );

  return (
    <DisplayUnitContext.Provider value={{ displayInMan, isHidden, toggleUnit, toggleHidden, formatNumberDisplay }}>
      {children}
    </DisplayUnitContext.Provider>
  );
}

export function useDisplayUnit() {
  return useContext(DisplayUnitContext);
}
