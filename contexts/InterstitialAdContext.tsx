import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { useSubscription } from '../hooks/useSubscription';
import {
  getAdUnitId,
  getCurrentPlatform,
  isAdDisplayEnabled,
} from '../lib/admob-config';

interface InterstitialAdContextType {
  showInterstitialAd: (onAdClosed?: () => void) => Promise<boolean>;
  isAdReady: boolean;
  isAdLoading: boolean;
}

const InterstitialAdContext = createContext<InterstitialAdContextType | null>(
  null
);

export const InterstitialAdProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { isPro, isLoading: subscriptionLoading } = useSubscription();
  const [interstitialAd, setInterstitialAd] = useState<InterstitialAd | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adLoadTime, setAdLoadTime] = useState<number | null>(null);
  const onClosedCallbackRef = useRef<(() => void) | null>(null);

  // 広告を読み込み
  const loadAd = async (): Promise<boolean> => {
    if (isAdLoading || isPro || subscriptionLoading) {
      return false;
    }

    return new Promise((resolve) => {
      let resolved = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      try {
        setIsAdLoading(true);

        const platform = getCurrentPlatform();
        const unitId = getAdUnitId('interstitial', platform);

        // 既存の広告インスタンスがある場合はクリーンアップ
        if (interstitialAd) {
          interstitialAd.removeAllListeners();
        }

        const ad = InterstitialAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly: false,
        });

        // LOADEDイベント
        ad.addAdEventListener(AdEventType.LOADED, () => {
          if (resolved) return;
          resolved = true;
          cleanup();
          setIsLoaded(true);
          setIsAdLoading(false);
          setAdLoadTime(Date.now()); // 読み込み時刻を記録
          resolve(true);
        });

        // CLOSEDイベント
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          // Refに保存されたコールバックを実行
          if (onClosedCallbackRef.current) {
            try {
              onClosedCallbackRef.current();
            } catch (error) {
              console.error('❌ Error executing ad closed callback:', error);
            }
            // コールバックをクリア
            onClosedCallbackRef.current = null;
          }

          // 広告が閉じた後にisLoadedをfalseにする
          setIsLoaded(false);
          setInterstitialAd(null); // 広告インスタンスをクリア

          // 次の広告を自動的にプリロード（1秒後に）
          setTimeout(() => {
            loadAd();
          }, 1000);
        });

        // ERRORイベント（読み込みエラー）
        ad.addAdEventListener(AdEventType.ERROR, (error) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          // "no-fill"エラーは広告在庫がない場合の正常なエラーなので、エラーログを出さない
          if (error.code === 'googleMobileAds/no-fill') {
            if (__DEV__) {
              console.log('ℹ️ No ad available (no-fill) - this is normal');
            }
          } else {
            // その他のエラーはログに出力
            console.error('❌ Interstitial ad load error:', error);
            console.error('❌ Error details:', {
              code: error.code,
              message: error.message,
              domain: error.domain,
            });
          }
          setIsLoaded(false);
          setIsAdLoading(false);
          resolve(false);
        });

        // OPENEDイベント（デバッグ用）
        ad.addAdEventListener(AdEventType.OPENED, () => {
          // 広告が正常に表示されたことを確認
        });

        // CLICKEDイベント（デバッグ用）
        ad.addAdEventListener(AdEventType.CLICKED, () => {});

        setInterstitialAd(ad);
        ad.load();

        // タイムアウト: 10秒で読み込みが完了しない場合はfalseを返す
        timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            setIsAdLoading(false);
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.error('❌ Interstitial ad load error:', error);
          setIsAdLoading(false);
          resolve(false);
        }
      }
    });
  };

  // 広告を表示
  const showInterstitialAd = async (
    onClosed?: () => void
  ): Promise<boolean> => {
    // サブスクリプション状態が未確定の場合は表示しない
    if (subscriptionLoading) {
      return false;
    }

    // Proユーザーの場合は広告を表示しない
    if (isPro) {
      return false;
    }

    // 広告が読み込まれていない場合は読み込みを試行して待機
    if (!interstitialAd || !isLoaded) {
      // 既に読み込み中の場合は待機
      if (isAdLoading) {
        // 最大5秒待機
        const maxWaitTime = 5000;
        const startTime = Date.now();
        while (isAdLoading && Date.now() - startTime < maxWaitTime) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        // 待機後も読み込まれていない場合はfalseを返す
        if (!isLoaded || !interstitialAd) {
          return false;
        }
      } else {
        // 読み込みを開始して完了を待つ
        const loadResult = await loadAd();
        if (!loadResult || !isLoaded || !interstitialAd) {
          return false;
        }
      }
    }

    // 広告の有効期限チェック（1時間 = 3600000ms）
    if (adLoadTime && Date.now() - adLoadTime > 3600000) {
      setIsLoaded(false);
      // 再読み込みを開始して完了を待つ
      const reloadResult = await loadAd();
      if (!reloadResult || !isLoaded || !interstitialAd) {
        return false;
      }
      // 再読み込みが成功したら続行（return falseを削除して続行）
    }

    // 広告の読み込み完了から十分な時間が経過しているかチェック
    if (adLoadTime && Date.now() - adLoadTime < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 広告が無効の場合は表示しない
    if (!isAdDisplayEnabled()) {
      return false;
    }

    try {
      // コールバックをRefに保存
      if (onClosed) {
        onClosedCallbackRef.current = onClosed;
      }

      // 広告表示前に少し待機（AdMobの初期化を待つ）
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 広告表示前の最終チェック
      if (!interstitialAd || !isLoaded) {
        console.error('❌ Ad not ready for show:', {
          hasAd: !!interstitialAd,
          isLoaded,
        });
        return false;
      }

      // 広告を表示
      interstitialAd.show();

      return true;
    } catch (error) {
      console.error('❌ Interstitial ad show error:', error);
      console.error('❌ Show error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // エラー時はコールバックをクリア
      onClosedCallbackRef.current = null;

      // 表示失敗時もコールバックを実行（フォールバック）
      if (onClosed) {
        try {
          onClosed();
        } catch (callbackError) {
          console.error(
            '❌ Error executing callback after show error:',
            callbackError
          );
        }
      }

      return false;
    }
  };

  // 初期化: サブスクリプション状態が確定したら広告を読み込み
  useEffect(() => {
    if (!subscriptionLoading && !isPro && isAdDisplayEnabled()) {
      loadAd();
    }
  }, [isPro, subscriptionLoading]);

  // クリーンアップ: コンポーネントアンマウント時
  useEffect(() => {
    return () => {
      if (interstitialAd) {
        interstitialAd.removeAllListeners();
      }
    };
  }, []);

  return (
    <InterstitialAdContext.Provider
      value={{
        showInterstitialAd,
        isAdReady: isLoaded,
        isAdLoading,
      }}
    >
      {children}
    </InterstitialAdContext.Provider>
  );
};

export const useInterstitialAdContext = () => {
  const context = useContext(InterstitialAdContext);
  if (!context) {
    throw new Error(
      'useInterstitialAdContext must be used within InterstitialAdProvider'
    );
  }
  return context;
};
