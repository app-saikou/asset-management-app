import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useAssetHistory } from '../hooks/useAssetHistory';
import { AssetChangeCard } from '../components/AssetChangeCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';
type ProjectionRow = {
  month_year: string;
  balance: number | string;
  asset_type?: 'cash' | 'stock';
  asset?: {
    type?: string | null;
    name?: string | null;
  } | null;
};

type ChartPoint = {
  x: Date;
  y: number;
  breakdown: Record<string, number>;
  monthKey: string;
};

type SeriesData = {
  points: ChartPoint[];
  label: string;
};

type GiftedLineItem = lineDataItem & { chartPoint: ChartPoint };

const CHART_INITIAL_SPACING = 20;
const CHART_END_SPACING = CHART_INITIAL_SPACING;
const CHART_HEIGHT = 180;

type TargetAgePointInfo = {
  index: number;
  item: GiftedLineItem;
};

const generateNiceTicks = (maxValue: number, sections = 4): number[] => {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return [];
  }
  const exponent = Math.floor(Math.log10(maxValue));
  const magnitude = Math.pow(10, exponent);
  const fraction = maxValue / magnitude;
  let niceFraction: number;
  // 最大値に近い「キリのいい数値」を選ぶ（離れすぎないように）
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 1.5) niceFraction = 1.5;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 3) niceFraction = 3;
  else if (fraction <= 5) niceFraction = 5;
  else if (fraction <= 6) niceFraction = 6;
  else if (fraction <= 7) niceFraction = 7;
  else if (fraction <= 8) niceFraction = 8;
  else if (fraction <= 9) niceFraction = 9;
  else niceFraction = 10;

  const niceMax = niceFraction * magnitude;
  const step = niceMax / sections;
  const ticks: number[] = [];
  for (let i = 0; i <= sections; i += 1) {
    ticks.push(step * i);
  }
  return ticks;
};

export default function HistoryDetailScreen() {
  const params = useLocalSearchParams();
  const { deleteHistory, formatNumber, history } = useAssetHistory();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [currentSeries, setCurrentSeries] = useState<SeriesData | null>(null);
  const [previousSeries, setPreviousSeries] = useState<SeriesData | null>(null);
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);
  const activePointRef = useRef<ChartPoint | null>(null);
  const chartRef = useRef<ScrollView | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [userBirthDate, setUserBirthDate] = useState<Date | null>(null);
  const [targetAge, setTargetAge] = useState<number | null>(null);
  const [targetMonth, setTargetMonth] = useState<number | null>(null);
  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [assetTargetAgeBalances, setAssetTargetAgeBalances] = useState<
    Map<string, number>
  >(new Map());
  const [activeTab, setActiveTab] = useState<'graph' | 'table'>('graph');
  const [showFullRange, setShowFullRange] = useState(false);

  const hasRealSeries = Boolean(currentSeries && currentSeries.points.length);
  const windowWidth = useMemo(() => Dimensions.get('window').width, []);
  const chartContainerWidth = useMemo(() => windowWidth, [windowWidth]);
  const chartCanvasWidth = useMemo(() => {
    // Y軸ラベル幅(70) + 右側余白(24) を考慮
    return Math.max(windowWidth - 70 - 12, 220);
  }, [windowWidth]);

  const { id, createdAt, isNewCalculation, isOnboarding } = params;

  // 履歴詳細データを取得
  const historyItem = history.find((item) => item.id === id);
  const assetDetails = useMemo(
    () => historyItem?.asset_history_details || [],
    [historyItem?.asset_history_details]
  );

  // 新規計算結果かどうかを判定
  const isNewResult = isNewCalculation === 'true';
  // オンボーディングからの遷移かどうかを判定
  const isFromOnboarding = isOnboarding === 'true';

  // 日付フォーマット
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

  // 削除確認
  const handleDelete = () => {
    Alert.alert(
      '記録を削除',
      'この記録を削除しますか？この操作は取り消せません。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  // 削除実行
  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteHistory(id as string);
      router.back();
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '記録の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!Number.isFinite(value)) return '¥0';
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs >= 1_0000_0000) {
      return `${sign}¥${(abs / 1_0000_0000).toFixed(1)}億`;
    }
    if (abs >= 1_0000) {
      return `${sign}¥${(abs / 1_0000).toFixed(1)}万`;
    }
    return `${sign}¥${Math.abs(Math.round(value)).toLocaleString('ja-JP')}`;
  };
  const formatCurrencyByUnit = (value: number, unit: 'oku' | 'man'): string => {
    if (!Number.isFinite(value)) return '¥0';
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (unit === 'oku') {
      if (abs === 0) return '¥0';
      return `${sign}¥${(abs / 1_0000_0000).toFixed(1)}億`;
    }
    if (abs === 0) return '¥0';
    return `${sign}¥${Math.round(abs / 1_0000)}万`;
  };

  const formatYearLabel = (date: Date) => {
    const year = date.getFullYear();
    return `${year}年`;
  };

  const formatYearMonthLabel = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };

  // const formatBreakdownKey = (key: string) => {
  //   if (key === 'cash') return '現金';
  //   if (key === 'stock') return '株式';
  //   return key;
  // };

  const safeFormatYearLabel = (value: Date | string | number) => {
    if (value instanceof Date) {
      return formatYearLabel(value);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return formatYearLabel(parsed);
  };

  const safeFormatYearMonthLabel = (value: Date | string | number) => {
    if (value instanceof Date) {
      return formatYearMonthLabel(value);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return formatYearMonthLabel(parsed);
  };

  useEffect(() => {
    if (!user?.id) return;
    if (!historyItem) return;

    const loadChartData = async () => {
      // この関数内で計算した目標年齢時点の日付（stateのtargetDateよりも最新・確実な値）
      let localTargetDate: Date | null = null;
      setChartLoading(true);
      try {
        // ユーザー生年月日取得（ツールチップ年齢表示用）
        let birthDate: Date | null = null;
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('birth_date')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.birth_date) {
            birthDate = new Date(profile.birth_date);
            setUserBirthDate(birthDate);
          } else {
            setUserBirthDate(null);
          }
        } catch (e) {
          setUserBirthDate(null);
        }

        // 目標年齢と目標額を取得
        try {
          const { data: calculationAges } = await supabase
            .from('user_calculation_ages')
            .select('target_age, target_month, target_amount')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(1);

          if (calculationAges && calculationAges.length > 0) {
            const ageData = calculationAges[0];
            setTargetAge(ageData.target_age);
            setTargetMonth(ageData.target_month ?? 0);
            const amount = ageData.target_amount
              ? Number(ageData.target_amount)
              : null;
            setTargetAmount(amount);
            if (__DEV__) {
              console.log('[history-detail] 目標額取得:', {
                raw: ageData.target_amount,
                parsed: amount,
                target_age: ageData.target_age,
              });
            }

            // 目標年齢の日付を計算
            if (birthDate && ageData.target_age !== null) {
              const targetYear = birthDate.getFullYear() + ageData.target_age;
              const targetMonthValue =
                birthDate.getMonth() + (ageData.target_month ?? 0);
              const targetDay = birthDate.getDate();
              const calculatedTargetDate = new Date(
                targetYear,
                targetMonthValue,
                targetDay
              );
              setTargetDate(calculatedTargetDate);
              localTargetDate = calculatedTargetDate;
            } else {
              setTargetDate(null);
              localTargetDate = null;
            }
          } else {
            setTargetAge(null);
            setTargetMonth(null);
            setTargetAmount(null);
            setTargetDate(null);
            localTargetDate = null;
          }
        } catch (e) {
          console.error('目標年齢・目標額取得エラー:', e);
          setTargetAge(null);
          setTargetMonth(null);
          setTargetAmount(null);
          setTargetDate(null);
        }
        if (!historyItem.projection_run_id) {
          console.warn('projection_run_id が履歴に紐付いていません');
          setCurrentSeries(null);
          setPreviousSeries(null);
          setActivePoint(null);
          return;
        }

        // ページングで全件取得（サーバー側の per-request 上限対策）
        const PAGE_SIZE = 500;

        // 前回の履歴を取得
        const currentIndex = history.findIndex((item) => item.id === id);
        const previousHistoryItem =
          currentIndex >= 0 && currentIndex < history.length - 1
            ? history[currentIndex + 1]
            : null;

        // 前回の履歴のグラフデータを取得（projection_run_idがある場合のみ）
        let previousProjectionsList: ProjectionRow[] = [];
        if (previousHistoryItem?.projection_run_id) {
          try {
            let previousOffset = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const {
                data: previousProjectionsPage,
                error: previousProjectionError,
              } = await supabase
                .from('monthly_asset_projections')
                .select(
                  `
                    month_year,
                    balance,
                    asset_type,
                    asset:multiple_assets (
                      type,
                      name
                    )
                  `
                )
                .eq('user_id', user.id)
                .eq('projection_run_id', previousHistoryItem.projection_run_id)
                .order('month_year', { ascending: true })
                .range(previousOffset, previousOffset + PAGE_SIZE - 1);

              if (previousProjectionError) throw previousProjectionError;

              const previousPageList = (previousProjectionsPage ||
                []) as ProjectionRow[];
              previousProjectionsList =
                previousProjectionsList.concat(previousPageList);
              if (previousPageList.length < PAGE_SIZE) break;
              previousOffset += PAGE_SIZE;
            }
          } catch (previousError) {
            console.error('前回のグラフデータ取得エラー:', previousError);
            // エラーが発生しても続行（前回のデータがないだけ）
          }
        }
        let offset = 0;
        let allProjections: ProjectionRow[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: projectionsPage, error: projectionError } =
            await supabase
              .from('monthly_asset_projections')
              .select(
                `
                month_year,
                balance,
                asset_type,
                asset:multiple_assets (
                  type,
                  name
                )
              `
              )
              .eq('user_id', user.id)
              .eq('projection_run_id', historyItem.projection_run_id)
              .order('month_year', { ascending: true })
              .range(offset, offset + PAGE_SIZE - 1);

          if (projectionError) throw projectionError;

          const pageList = (projectionsPage || []) as ProjectionRow[];
          allProjections = allProjections.concat(pageList);
          if (__DEV__) {
            console.log(
              '[HistoryDetail] fetched batch:',
              pageList.length,
              'offset:',
              offset
            );
          }
          if (pageList.length < PAGE_SIZE) break;
          offset += PAGE_SIZE;
        }

        const projectionsList = allProjections;
        if (projectionsList.length === 0) {
          setCurrentSeries(null);
          setActivePoint(null);
          return;
        }
        if (__DEV__) {
          const firstMonth = projectionsList[0]?.month_year;
          const lastMonth =
            projectionsList[projectionsList.length - 1]?.month_year;
          // 取得件数と範囲
          console.log(
            '[HistoryDetail] fetched projections:',
            projectionsList.length,
            'range:',
            firstMonth,
            '->',
            lastMonth
          );
        }

        const monthlyMap = new Map<
          string,
          {
            total: number;
            breakdown: Record<string, number>;
          }
        >();

        projectionsList.forEach((point: ProjectionRow) => {
          const monthKey = point.month_year;
          const typeKey =
            point.asset_type ||
            (point.asset?.type && point.asset.type.trim() !== ''
              ? point.asset.type.trim()
              : null);
          if (!typeKey || (typeKey !== 'cash' && typeKey !== 'stock')) {
            return;
          }
          const current = monthlyMap.get(monthKey) || {
            total: 0,
            breakdown: {},
          };
          const balance = Number(point.balance ?? 0);
          current.total += balance;
          current.breakdown[typeKey] =
            (current.breakdown[typeKey] || 0) + balance;
          monthlyMap.set(monthKey, current);
        });

        const sortedMonths = Array.from(monthlyMap.keys()).sort();
        const pointsData = sortedMonths.map((monthKey: string) => {
          const entry = monthlyMap.get(monthKey);
          const [yearStr, monthStr] = monthKey.split('-');
          const year = Number(yearStr);
          const month = Number(monthStr) - 1;
          const dateValue = new Date(year, month, 1);
          if (!entry) {
            return {
              x: dateValue,
              y: 0,
              breakdown: {},
              monthKey,
            };
          }
          return {
            x: dateValue,
            y: entry.total,
            breakdown: entry.breakdown,
            monthKey,
          };
        });
        if (__DEV__) {
          console.log(
            '[HistoryDetail] pointsData:',
            pointsData.length,
            'first:',
            pointsData[0]?.monthKey,
            'last:',
            pointsData[pointsData.length - 1]?.monthKey
          );
        }

        const latestSeries: SeriesData = {
          label: '今回',
          points: pointsData,
        };

        setCurrentSeries(latestSeries);

        // 前回のグラフデータを処理
        if (previousProjectionsList.length > 0) {
          const previousMonthlyMap = new Map<
            string,
            {
              total: number;
              breakdown: Record<string, number>;
            }
          >();

          previousProjectionsList.forEach((point: ProjectionRow) => {
            const monthKey = point.month_year;
            const typeKey =
              point.asset_type ||
              (point.asset?.type && point.asset.type.trim() !== ''
                ? point.asset.type.trim()
                : null);
            if (!typeKey || (typeKey !== 'cash' && typeKey !== 'stock')) {
              return;
            }
            const current = previousMonthlyMap.get(monthKey) || {
              total: 0,
              breakdown: {},
            };
            const balance = Number(point.balance ?? 0);
            current.total += balance;
            current.breakdown[typeKey] =
              (current.breakdown[typeKey] || 0) + balance;
            previousMonthlyMap.set(monthKey, current);
          });

          const previousSortedMonths = Array.from(
            previousMonthlyMap.keys()
          ).sort();
          const previousPointsData = previousSortedMonths.map(
            (monthKey: string) => {
              const entry = previousMonthlyMap.get(monthKey);
              const [yearStr, monthStr] = monthKey.split('-');
              const year = Number(yearStr);
              const month = Number(monthStr) - 1;
              const dateValue = new Date(year, month, 1);
              if (!entry) {
                return {
                  x: dateValue,
                  y: 0,
                  breakdown: {},
                  monthKey,
                };
              }
              return {
                x: dateValue,
                y: entry.total,
                breakdown: entry.breakdown,
                monthKey,
              };
            }
          );

          const previousSeriesData: SeriesData = {
            label: '前回',
            points: previousPointsData,
          };

          setPreviousSeries(previousSeriesData);
        } else {
          setPreviousSeries(null);
        }

        if (latestSeries.points.length > 0) {
          // 初期値は目標年齢時点のデータを設定（なければ最初のデータ）
          let initialPoint = latestSeries.points[0]; // デフォルトは最初のデータ

          // 目標年齢の日付を使用
          // 注意: stateのtargetDateはこの関数内でsetされるため、このタイミングではまだ最新値になっていない可能性がある。
          // そのため、この関数内で計算したlocalTargetDateを優先的に使用する。
          if (localTargetDate) {
            // 目標年齢時点のデータを探す
            const targetMonthKey = `${localTargetDate.getFullYear()}-${String(
              localTargetDate.getMonth() + 1
            ).padStart(2, '0')}-01`;

            const targetPoint = latestSeries.points.find(
              (p) => p.monthKey === targetMonthKey
            );

            if (targetPoint) {
              initialPoint = targetPoint;
            } else {
              // 完全一致がない場合は最も近いポイントを探す
              const targetTime = localTargetDate.getTime();
              let closestPoint = latestSeries.points[0];
              let closestDiff = Infinity;

              latestSeries.points.forEach((point) => {
                const pointTime =
                  point.x instanceof Date
                    ? point.x.getTime()
                    : new Date(point.x).getTime();
                const diff = Math.abs(pointTime - targetTime);
                if (diff < closestDiff) {
                  closestDiff = diff;
                  closestPoint = point;
                }
              });
              initialPoint = closestPoint;
            }
          }

          activePointRef.current = initialPoint;
          setActivePoint(initialPoint);
        } else {
          activePointRef.current = null;
          setActivePoint(null);
        }
      } catch (error) {
        console.error('資産推移グラフデータ取得エラー:', error);
        setCurrentSeries(null);
        setPreviousSeries(null);
        setActivePoint(null);
      } finally {
        setChartLoading(false);
      }
    };

    loadChartData();
  }, [user?.id, historyItem?.id, historyItem?.projection_run_id, history]);

  // 各資産の目標年齢時点の残高を取得
  useEffect(() => {
    const fetchAssetTargetAgeBalances = async () => {
      if (
        !historyItem?.projection_run_id ||
        !targetDate ||
        !assetDetails.length ||
        !user?.id
      ) {
        setAssetTargetAgeBalances(new Map());
        return;
      }

      const targetMonthKey = `${targetDate.getFullYear()}-${String(
        targetDate.getMonth() + 1
      ).padStart(2, '0')}-01`;

      const balances = new Map<string, number>();

      try {
        const assetIds = assetDetails
          .map((d) => d.asset_id)
          .filter((id): id is string => Boolean(id));

        if (assetIds.length > 0) {
          const { data: projections, error } = await supabase
            .from('monthly_asset_projections')
            .select('asset_id, balance')
            .eq('user_id', user.id)
            .eq('projection_run_id', historyItem.projection_run_id)
            .in('asset_id', assetIds)
            .eq('month_year', targetMonthKey);

          if (error) throw error;

          for (const projection of projections || []) {
            if (
              projection.asset_id &&
              projection.balance !== null &&
              projection.balance !== undefined
            ) {
              balances.set(projection.asset_id, Number(projection.balance));
            }
          }
        }
      } catch (error) {
        console.error('資産別目標年齢時点の残高取得エラー:', error);
      }

      setAssetTargetAgeBalances(balances);
    };

    fetchAssetTargetAgeBalances();
  }, [historyItem?.projection_run_id, targetDate, assetDetails, user?.id]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!hasRealSeries || !currentSeries) return [];
    return currentSeries.points.map((point) => {
      const date =
        point.x instanceof Date ? point.x : new Date(point.x ?? Date.now());
      return {
        x: date,
        y: Number.isFinite(point.y) ? point.y : 0,
        monthKey: point.monthKey,
        breakdown: point.breakdown,
      } as ChartPoint;
    });
  }, [hasRealSeries, currentSeries]);

  const previousChartPoints = useMemo<ChartPoint[]>(() => {
    if (!previousSeries || !previousSeries.points.length) return [];
    return previousSeries.points.map((point) => {
      const date =
        point.x instanceof Date ? point.x : new Date(point.x ?? Date.now());
      return {
        x: date,
        y: Number.isFinite(point.y) ? point.y : 0,
        monthKey: point.monthKey,
        breakdown: point.breakdown,
      } as ChartPoint;
    });
  }, [previousSeries]);

  // 表示範囲フィルタ（目標年齢まで or 全期間）
  const visibleChartPoints = useMemo<ChartPoint[]>(() => {
    if (showFullRange || !targetDate) return chartPoints;
    return chartPoints.filter((p) => {
      const date = p.x instanceof Date ? p.x : new Date(p.x);
      return date <= targetDate;
    });
  }, [chartPoints, targetDate, showFullRange]);

  const visiblePreviousChartPoints = useMemo<ChartPoint[]>(() => {
    if (showFullRange || !targetDate) return previousChartPoints;
    return previousChartPoints.filter((p) => {
      const date = p.x instanceof Date ? p.x : new Date(p.x);
      return date <= targetDate;
    });
  }, [previousChartPoints, targetDate, showFullRange]);

  const lineChartData = useMemo<GiftedLineItem[]>(() => {
    if (!visibleChartPoints.length) return [];
    const items = visibleChartPoints.map((point) => {
      return {
        value: point.y,
        label: '',
        chartPoint: point,
      };
    });
    if (__DEV__) {
      console.log(
        '[HistoryDetail] lineChartData:',
        items.length,
        'last:',
        items[items.length - 1]?.chartPoint?.monthKey
      );
    }
    return items;
  }, [visibleChartPoints]);

  const previousLineChartData = useMemo<GiftedLineItem[]>(() => {
    if (!visiblePreviousChartPoints.length) return [];
    const items = visiblePreviousChartPoints.map((point) => {
      return {
        value: point.y,
        label: '',
        chartPoint: point,
      };
    });
    if (__DEV__) {
      console.log(
        '[HistoryDetail] previousLineChartData:',
        items.length,
        'last:',
        items[items.length - 1]?.chartPoint?.monthKey
      );
    }
    return items;
  }, [visiblePreviousChartPoints]);

  const targetAgePointInfo = useMemo<TargetAgePointInfo | null>(() => {
    if (!targetDate || !lineChartData.length) return null;
    const targetMonthKey = `${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1
    ).padStart(2, '0')}-01`;
    let targetAgeIndex = lineChartData.findIndex(
      (item) => item.chartPoint.monthKey === targetMonthKey
    );
    if (targetAgeIndex === -1) {
      const targetTime = targetDate.getTime();
      let futureIndex: number | null = null;
      let futureDiff = Infinity;
      let pastIndex: number | null = null;
      let pastDiff = Infinity;
      lineChartData.forEach((item, index) => {
        const pointTime =
          item.chartPoint.x instanceof Date
            ? item.chartPoint.x.getTime()
            : new Date(item.chartPoint.x).getTime();
        const diff = pointTime - targetTime;
        if (diff >= 0) {
          if (diff < futureDiff) {
            futureDiff = diff;
            futureIndex = index;
          }
        } else {
          const absDiff = Math.abs(diff);
          if (absDiff < pastDiff) {
            pastDiff = absDiff;
            pastIndex = index;
          }
        }
      });
      if (futureIndex !== null) {
        targetAgeIndex = futureIndex;
      } else if (pastIndex !== null) {
        targetAgeIndex = pastIndex;
      }
    }
    if (targetAgeIndex === -1) return null;
    return {
      index: targetAgeIndex,
      item: lineChartData[targetAgeIndex],
    };
  }, [lineChartData, targetDate]);

  // const targetAgeBalance = useMemo(() => {
  //   if (!targetAgePointInfo) return null;
  //   const value = targetAgePointInfo.item.value;
  //   return Number.isFinite(value) ? Number(value) : null;
  // }, [targetAgePointInfo]);

  // const futureValuePointInfo = useMemo<TargetAgePointInfo | null>(() => {
  //   if (!targetDate || !lineChartData.length) return null;
  //   // 目標年齢時点の月を探す（次の月ではなく、目標年齢時点の月）
  //   const targetMonthDate = new Date(
  //     targetDate.getFullYear(),
  //     targetDate.getMonth(),
  //     1
  //   );
  //   const targetMonthKey = `${targetMonthDate.getFullYear()}-${String(
  //     targetMonthDate.getMonth() + 1
  //   ).padStart(2, '0')}-01`;
  //   let targetIndex = lineChartData.findIndex(
  //     (item) => item.chartPoint.monthKey === targetMonthKey
  //   );
  //   // 見つからない場合は、最も近い月を探す
  //   if (targetIndex === -1) {
  //     const targetTime = targetMonthDate.getTime();
  //     let closestIndex: number | null = null;
  //     let closestDiff = Infinity;
  //     lineChartData.forEach((item, index) => {
  //       const pointTime =
  //         item.chartPoint.x instanceof Date
  //           ? item.chartPoint.x.getTime()
  //           : new Date(item.chartPoint.x).getTime();
  //       const diff = Math.abs(pointTime - targetTime);
  //       if (diff < closestDiff) {
  //         closestDiff = diff;
  //         closestIndex = index;
  //       }
  //     });
  //     if (closestIndex !== null) {
  //       targetIndex = closestIndex;
  //     }
  //   }
  //   if (targetIndex === -1) return null;
  //   return {
  //     index: targetIndex,
  //     item: lineChartData[targetIndex],
  //   };
  // }, [lineChartData, targetDate]);

  const chartOffset = useMemo(() => {
    if (!lineChartData.length) return 0;
    const minVal = Math.min(...lineChartData.map((d) => d.value ?? 0));
    return minVal < 0 ? Math.abs(minVal) : 0;
  }, [lineChartData]);

  const decoratedLineChartData = useMemo<GiftedLineItem[]>(() => {
    if (!lineChartData.length) return [];
    const total = lineChartData.length;
    const maxLabels = Math.min(6, total);
    const labelIndexes = new Set<number>();
    labelIndexes.add(0);
    labelIndexes.add(total - 1);
    if (total <= maxLabels) {
      for (let i = 1; i < total - 1; i += 1) labelIndexes.add(i);
    } else {
      const step = (total - 1) / (maxLabels - 1);
      for (let i = 1; i < maxLabels - 1; i += 1) {
        labelIndexes.add(Math.round(step * i));
      }
    }

    const targetAgeIndex = targetAgePointInfo?.index ?? null;

    return lineChartData.map((item, index) => {
      const isTargetAge = targetAgeIndex !== null && index === targetAgeIndex;
      const isActive =
        activePoint && item.chartPoint.monthKey === activePoint.monthKey;
      const hasLabel = labelIndexes.has(index);
      // 点を表示するかどうか：ターゲット点またはアクティブ点のみ（ラベル表示点も非表示）
      const showDataPoint = isTargetAge || isActive;

      return {
        ...item,
        value: (item.value ?? 0) + chartOffset,
        // ラベルはデータ側に直接付与（等間隔で最大6個）
        label: hasLabel
          ? safeFormatYearLabel(item.chartPoint.x)?.replace('年', '') ?? ''
          : '',
        hideDataPoint: !showDataPoint,
        dataPointRadius: isTargetAge ? 6 : 3,
        dataPointColor: isTargetAge
          ? Colors.accent.success[600]
          : Colors.semantic.button.primary,
        textShiftY: isTargetAge ? -8 : 0,
        textShiftX: isTargetAge ? 0 : 0,
        textFontSize: isTargetAge ? 10 : 0,
        textColor: isTargetAge ? Colors.accent.success[600] : undefined,
      };
    });
  }, [lineChartData, activePoint, targetAgePointInfo, chartOffset]);

  // xAxisLabelTexts は使わず、データ側の label を使用する

  const primaryYAxisTicks = useMemo(() => {
    if (!decoratedLineChartData.length) return [];
    const dataMax = Math.max(
      ...decoratedLineChartData.map((item) => item.value ?? 0)
    );
    // 目標額も含めた最大値でティックを計算（シフト済み座標系で比較）
    const absoluteMax =
      targetAmount && targetAmount > 0
        ? Math.max(dataMax, targetAmount + chartOffset)
        : dataMax;

    if (__DEV__) {
      console.log('[Chart] dataMax(shifted):', dataMax, 'offset:', chartOffset, 'absoluteMax:', absoluteMax);
    }
    return generateNiceTicks(absoluteMax, 4);
  }, [decoratedLineChartData, targetAmount, chartOffset]);

  const yAxisUnit = useMemo<'oku' | 'man'>(() => {
    const maxTick = primaryYAxisTicks[primaryYAxisTicks.length - 1] ?? 0;
    return maxTick >= 1_0000_0000 ? 'oku' : 'man';
  }, [primaryYAxisTicks]);

  const lineChartMaxValue = useMemo(() => {
    if (!primaryYAxisTicks.length) return undefined;
    return primaryYAxisTicks[primaryYAxisTicks.length - 1];
  }, [primaryYAxisTicks]);

  const decoratedPreviousLineChartData = useMemo<GiftedLineItem[]>(() => {
    if (!previousLineChartData.length) return [];
    const cap = lineChartMaxValue ?? Infinity;
    // 前回のデータも今回と同じ座標系にシフト・maxValue 超えはキャップ
    return previousLineChartData.map((item) => {
      return {
        ...item,
        value: Math.min((item.value ?? 0) + chartOffset, cap),
        label: '',
        hideDataPoint: true,
      };
    });
  }, [previousLineChartData, lineChartMaxValue, chartOffset]);

  const lineChartSections = useMemo(() => {
    if (!primaryYAxisTicks.length) return undefined;
    return Math.max(primaryYAxisTicks.length - 1, 1);
  }, [primaryYAxisTicks]);

  const lineChartStepValue = useMemo(() => {
    if (!lineChartMaxValue || !lineChartSections) return undefined;
    return lineChartMaxValue / lineChartSections;
  }, [lineChartMaxValue, lineChartSections]);

  const lineChartYAxisLabels = useMemo(() => {
    if (!primaryYAxisTicks.length) return undefined;
    // tick はシフト済み座標 → -chartOffset で実値に戻してラベル表示
    const labels = primaryYAxisTicks.map((tick) =>
      formatCurrencyByUnit(tick - chartOffset, yAxisUnit)
    );
    const maxLength = Math.max(...labels.map((l) => l.length));
    return labels.map((l) => l.padStart(maxLength, ' '));
  }, [primaryYAxisTicks, yAxisUnit, chartOffset]);

  // 後方互換性のため残すが、複数の目標年齢には使用しない
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const targetAmountLabelText = useMemo(() => {
    if (!targetAmount) return null;
    const unit = targetAmount >= 1_0000_0000 ? 'oku' : 'man';
    return formatCurrencyByUnit(targetAmount, unit);
  }, [targetAmount]);

  const lineChartSpacing = useMemo(() => {
    const dataCount = decoratedLineChartData.length;
    if (dataCount <= 1) {
      return Math.max(
        chartCanvasWidth - (CHART_INITIAL_SPACING + CHART_END_SPACING),
        CHART_INITIAL_SPACING
      );
    }
    const usableWidth = Math.max(
      chartCanvasWidth - (CHART_INITIAL_SPACING + CHART_END_SPACING) - 1,
      1
    );
    return usableWidth / (dataCount - 1);
  }, [decoratedLineChartData.length, chartCanvasWidth]);

  // レイアウト確認ログ（最終点やスペーシングの確認）
  useEffect(() => {
    if (__DEV__) {
      console.log(
        '[HistoryDetail] chart layout:',
        'count =',
        decoratedLineChartData.length,
        'spacing =',
        lineChartSpacing,
        'width =',
        chartCanvasWidth,
        'endSpacing =',
        CHART_END_SPACING
      );
      const last = decoratedLineChartData[decoratedLineChartData.length - 1];
      if (last) {
        console.log(
          '[HistoryDetail] last point:',
          last.chartPoint.monthKey,
          'value:',
          last.value
        );
      }
    }
  }, [decoratedLineChartData, lineChartSpacing, chartCanvasWidth]);

  // 目標年齢への初期スクロール
  useEffect(() => {
    if (!chartLoading && targetAgePointInfo && chartRef.current) {
      setTimeout(() => {
        if (!chartRef.current) return;

        if (!showFullRange) {
          // 目標年齢モード：データが画面内に収まるので左端から表示
          chartRef.current.scrollTo({ x: 0, animated: true });
          return;
        }

        const x = targetAgePointInfo.index * lineChartSpacing;
        // 画面中央に表示するためのオフセット計算
        const offset = Math.max(0, x - chartContainerWidth / 2);

        if (chartRef.current.scrollTo) {
          chartRef.current.scrollTo({ x: offset, animated: true });
        }
      }, 500);
    }
  }, [chartLoading, targetAgePointInfo, lineChartSpacing, chartContainerWidth, showFullRange]);

  // 表示範囲切り替え時：目標年齢点にリセット
  useEffect(() => {
    const resetIndex = targetAgePointInfo?.index ?? lineChartData.length - 1;
    const resetItem = lineChartData[resetIndex];
    if (resetItem?.chartPoint) {
      activePointRef.current = resetItem.chartPoint;
      setActivePoint(resetItem.chartPoint);
    }
  }, [showFullRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLinePointPress = useCallback((item?: GiftedLineItem) => {
    if (item?.chartPoint) {
      activePointRef.current = item.chartPoint;
      setActivePoint(item.chartPoint);
    }
  }, []);

  const buildAgeText = useCallback(
    (targetDate: Date) => {
      if (!userBirthDate) return '';
      let years = targetDate.getFullYear() - userBirthDate.getFullYear();
      let months = targetDate.getMonth() - userBirthDate.getMonth();
      if (
        months < 0 ||
        (months === 0 && targetDate.getDate() < userBirthDate.getDate())
      ) {
        years -= 1;
        months += 12;
      }
      if (targetDate.getDate() < userBirthDate.getDate()) {
        months = (months + 11) % 12;
      }
      if (months === 0) return `${years}歳`;
      return `${years}歳${months}ヶ月`;
    },
    [userBirthDate]
  );

  const getOrderedBreakdownEntries = useCallback(
    (breakdown: Record<string, number>) => {
      const categoryOrder: Array<{ key: string; label: string }> = [
        { key: 'cash', label: '現金' },
        { key: 'stock', label: '株式' },
      ];

      const rawEntries = Object.entries(breakdown || {}) as Array<
        [string, number]
      >;

      const orderedEntries = [
        ...categoryOrder.map(({ key, label }) => ({
          key,
          label,
          value: rawEntries.find(([entryKey]) => entryKey === key)?.[1] ?? 0,
        })),
        ...rawEntries
          .filter(
            ([entryKey]) => !categoryOrder.some(({ key }) => key === entryKey)
          )
          .map(([key, value]) => ({
            key,
            label: key,
            value,
          })),
      ];

      return orderedEntries;
    },
    []
  );

  const activePreviousPoint = useMemo(() => {
    if (!activePoint || !previousChartPoints.length) return null;
    // activePointと同じmonthKeyを持つデータを探す
    return previousChartPoints.find((p) => p.monthKey === activePoint.monthKey);
  }, [activePoint, previousChartPoints]);

  const diffValue = useMemo(() => {
    if (!activePoint || !activePreviousPoint) return null;
    return activePoint.y - activePreviousPoint.y;
  }, [activePoint, activePreviousPoint]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        {/* 新規計算結果またはオンボーディングでない場合のみ戻るボタンを表示 */}
        {!isNewResult && !isFromOnboarding && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.semantic.text.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {isFromOnboarding
              ? 'オンボーディング完了'
              : isNewResult
              ? '更新完了'
              : '記録詳細'}
          </Text>
          {!isNewResult && !isFromOnboarding && createdAt && (
            <View style={styles.headerDateBadge}>
              <Text style={styles.headerDateText}>
                {formatDateTime(createdAt as string)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 日時表示 - ヘッダーに移動したため削除 */}
          {/* <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {formatDateTime(createdAt as string)}
          </Text>
        </View> */}

          {/* メイン情報カード - 削除 */}
          {/* <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <TrendingUp size={24} color={Colors.semantic.button.primary} />
            <Text style={styles.cardTitle}>資産計算結果</Text>
          </View>

          <View style={styles.resultContainer}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>現在資産</Text>
              <Text style={styles.resultValue}>
                ¥{formatNumber(Number(currentAssets))}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>将来価値</Text>
              <Text style={[styles.resultValue, styles.futureValue]}>
                ¥{formatNumber(Math.max(0, roundedFutureValue))}
              </Text>
            </View>
          </View>

          <View style={styles.increaseContainer}>
            <Text style={styles.increaseLabel}>増加額</Text>
            <Text style={styles.increaseValue}>
              {roundedIncreaseAmount >= 0 ? '+' : '-'}¥
              {formatNumber(Math.abs(roundedIncreaseAmount))}
            </Text>
          </View>
        </View> */}

          {/* タブ */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'graph' && styles.activeTab]}
              onPress={() => setActiveTab('graph')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'graph' && styles.activeTabText,
                ]}
              >
                グラフ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'table' && styles.activeTab]}
              onPress={() => setActiveTab('table')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'table' && styles.activeTabText,
                ]}
              >
                表
              </Text>
            </TouchableOpacity>
          </View>

          {/* グラフ表示 */}
          {activeTab === 'graph' && (
            <View style={styles.graphSection}>
              {chartLoading ? (
                <View style={styles.skeletonActivePointCard}>
                  <View style={styles.skeletonActivePointHeader}>
                    <View style={[styles.skeletonBar, { width: 100 }]} />
                    <View style={[styles.skeletonBar, { width: 72 }]} />
                  </View>
                  <View style={styles.skeletonDivider} />
                  <View style={styles.skeletonActivePointBody}>
                    <View style={[styles.skeletonBar, { width: 140, height: 28 }]} />
                    <View style={{ gap: 6 }}>
                      <View style={[styles.skeletonBar, { width: 88 }]} />
                      <View style={[styles.skeletonBar, { width: 88 }]} />
                    </View>
                  </View>
                </View>
              ) : activePoint ? (
                <View style={styles.activePointInfoContainer}>
                  <View style={styles.activePointHeader}>
                    <View style={styles.dateAndAgeContainer}>
                      <Text style={styles.activePointDate}>
                        {safeFormatYearMonthLabel(activePoint.x)}
                      </Text>
                      {userBirthDate && (
                        <View style={styles.ageBadge}>
                          <Text style={styles.ageText}>
                            {buildAgeText(
                              activePoint.x instanceof Date
                                ? activePoint.x
                                : new Date(activePoint.x)
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.activePointBody}>
                    <View style={styles.currentRow}>
                      <View style={styles.currentTotalContainer}>
                        <View style={styles.currentLabelRow}>
                          <Text style={styles.activePointSectionLabel}>
                            今回
                          </Text>
                          <Text style={styles.activePointTotal}>
                            {formatCurrency(activePoint.y)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.breakdownContainer}>
                        {getOrderedBreakdownEntries(
                          activePoint.breakdown || {}
                        ).map(({ key, label, value }) => (
                          <View key={key} style={styles.activePointRow}>
                            <Text style={styles.activePointRowLabel}>
                              {label}
                            </Text>
                            <Text style={styles.activePointRowValue}>
                              {formatCurrency(value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {activePreviousPoint && (
                      <View style={styles.previousRow}>
                        <View style={styles.previousDivider} />
                        <View style={styles.previousInfo}>
                          <Text style={styles.activePointSectionLabelSecondary}>
                            前回:
                          </Text>
                          <Text style={styles.activePointTotalSecondary}>
                            {formatCurrency(activePreviousPoint.y)}
                          </Text>
                          {diffValue !== null && (
                            <View
                              style={[
                                styles.pointDiffBadge,
                                diffValue >= 0
                                  ? styles.pointDiffPositive
                                  : styles.pointDiffNegative,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.pointDiffText,
                                  diffValue >= 0
                                    ? styles.pointDiffTextPositive
                                    : styles.pointDiffTextNegative,
                                ]}
                              >
                                {diffValue > 0 ? '+' : diffValue < 0 ? '-' : ''}
                                {formatCurrency(Math.abs(diffValue))}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
              <Text style={styles.sectionTitle}>資産の推移</Text>
              <Text style={styles.graphSubtitle}>
                タップ & ドラッグで年ごとの資産内訳を確認できます
              </Text>
              {chartLoading ? (
                <View style={styles.skeletonContainer}>
                  <View style={styles.skeletonLegendRow}>
                    <View style={styles.skeletonLegendItem} />
                    <View style={styles.skeletonLegendItem} />
                    <View style={[styles.skeletonLegendItem, { width: 80 }]} />
                  </View>
                  <View style={styles.skeletonGraph} />
                </View>
              ) : chartPoints.length ? (
                <>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: Colors.semantic.button.primary },
                        ]}
                      />
                      <Text style={styles.legendLabel}>今回</Text>
                    </View>
                    {previousSeries && (
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: Colors.semantic.text.tertiary },
                          ]}
                        />
                        <Text style={styles.legendLabel}>前回</Text>
                      </View>
                    )}
                    {targetAge !== null && (
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: Colors.accent.success[600] },
                          ]}
                        />
                        <Text style={styles.legendLabel}>
                          目標年齢（{targetAge}歳
                          {targetMonth !== null && targetMonth > 0
                            ? `${targetMonth}ヶ月`
                            : ''}
                          ）
                        </Text>
                      </View>
                    )}
                    {targetAmount && targetAmount > 0 && (
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            {
                              backgroundColor: Colors.accent.success[600],
                              width: 8,
                              height: 2,
                              borderRadius: 0,
                            },
                          ]}
                        />
                        <Text style={styles.legendLabel}>
                          目標額: {formatCurrency(targetAmount)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 表示範囲タブ */}
                  {targetDate && (
                    <View style={styles.rangeTabRow}>
                      <View style={styles.rangeTabContainer}>
                        <TouchableOpacity
                          onPress={() => setShowFullRange(false)}
                          style={[styles.rangeTab, !showFullRange && styles.rangeTabActive]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.rangeTabText, !showFullRange && styles.rangeTabTextActive]}>
                            目標年齢
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowFullRange(true)}
                          style={[styles.rangeTab, showFullRange && styles.rangeTabActive]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.rangeTabText, showFullRange && styles.rangeTabTextActive]}>
                            全期間
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View
                    style={{
                      width: chartContainerWidth,
                      height: 240,
                      flexGrow: 0,
                      marginLeft: -12,
                      overflow: 'visible',
                      backgroundColor: '#ffffff',
                      position: 'relative',
                    }}
                  >
                    <View style={{ zIndex: 1 }}>
                      <LineChart
                        data={decoratedLineChartData}
                        data2={
                          decoratedPreviousLineChartData.length > 0
                            ? decoratedPreviousLineChartData
                            : undefined
                        }
                        curved
                        color={Colors.semantic.button.primary}
                        color2={Colors.semantic.text.tertiary}
                        thickness={3}
                        thickness2={2}
                        dataPointsColor={Colors.semantic.button.primary}
                        dataPointsRadius={3}
                        areaChart
                        startFillColor={Colors.semantic.button.primary}
                        endFillColor={Colors.semantic.button.primary}
                        startOpacity={0.15}
                        endOpacity={0}
                        height={CHART_HEIGHT}
                        width={chartCanvasWidth}
                        spacing={lineChartSpacing}
                        initialSpacing={CHART_INITIAL_SPACING}
                        endSpacing={CHART_END_SPACING + 8}
                        labelsExtraHeight={36}
                        maxValue={lineChartMaxValue}
                        noOfSections={lineChartSections}
                        stepValue={lineChartStepValue}
                        yAxisLabelTexts={lineChartYAxisLabels}
                        showReferenceLine1={Boolean(
                          targetAmount && targetAmount > 0
                        )}
                        referenceLine1Position={(targetAmount ?? 0) + chartOffset}
                        referenceLine1Config={{
                          color: Colors.accent.success[600],
                          thickness: 2,
                          width: chartCanvasWidth - CHART_INITIAL_SPACING,
                          dashWidth: 6,
                          dashGap: 4,
                        }}
                        showReferenceLine2={chartOffset > 0}
                        referenceLine2Position={chartOffset}
                        referenceLine2Config={{
                          color: Colors.base.gray400,
                          thickness: 1,
                          width: chartCanvasWidth - CHART_INITIAL_SPACING,
                          dashWidth: 4,
                          dashGap: 4,
                        }}
                        referenceLinesOverChartContent={false}
                        yAxisLabelWidth={70}
                        yAxisTextStyle={{
                          color: '#000',
                          fontSize: 12,
                          textAlign: 'right',
                          width: 60,
                          paddingRight: 4,
                        }}
                        xAxisLabelTextStyle={{
                          color: Colors.semantic.text.primary,
                          fontSize: 12,
                          marginLeft: -40,
                        }}
                        xAxisLabelsVerticalShift={4}
                        yAxisColor={Colors.semantic.border}
                        xAxisColor={Colors.semantic.border}
                        rulesColor="transparent"
                        showYAxisIndices={false}
                        showVerticalLines={false}
                        verticalLinesColor="transparent"
                        scrollRef={chartRef}
                        onPress={(item: GiftedLineItem) =>
                          handleLinePointPress(item)
                        }
                        backgroundColor="transparent"
                        pointerConfig={{
                          pointerColor: Colors.semantic.button.primary,
                          pointerLabelWidth: 0,
                          pointerLabelHeight: 0,
                          pointerVanishDelay: 80,
                          showPointerStrip: false,
                          pointerLabelComponent: (
                            item: GiftedLineItem | GiftedLineItem[]
                          ) => {
                            const primaryItem = Array.isArray(item)
                              ? item[0]
                              : item;

                            // ポインターが表示されているとき、activePointを更新
                            // setStateはレンダリング中に呼べないため、setTimeoutで次のフレームに遅延
                            if (primaryItem?.chartPoint) {
                              // 既に同じポイントが選択されている場合は更新しない（無限ループ防止）
                              if (
                                !activePointRef.current ||
                                activePointRef.current.monthKey !==
                                  primaryItem.chartPoint.monthKey
                              ) {
                                activePointRef.current = primaryItem.chartPoint;
                                // レンダリング後に状態を更新
                                setTimeout(() => {
                                  setActivePoint(primaryItem.chartPoint);
                                }, 0);
                              }
                            }

                            return null;
                          },
                        }}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataTitle}>
                    データが取得できませんでした
                  </Text>
                  <Text style={styles.noDataMessage}>
                    ネットワーク環境を確認し、再度お試しください。
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 表表示 */}
          {activeTab === 'table' && (
            <View style={styles.tableSection}>
              {chartLoading ? (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataTitle}>読み込み中...</Text>
                </View>
              ) : chartPoints.length > 0 ? (
                <View style={styles.tableContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      {/* ヘッダー行 */}
                      <View style={styles.tableHeader}>
                        <Text
                          style={[styles.tableHeaderCell, styles.tableDateCell]}
                        >
                          年月
                        </Text>
                        {userBirthDate && (
                          <Text
                            style={[
                              styles.tableHeaderCell,
                              styles.tableAgeCell,
                            ]}
                          >
                            年齢
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.tableHeaderCell,
                            styles.tableAmountCell,
                          ]}
                        >
                          総資産
                        </Text>
                        <Text
                          style={[
                            styles.tableHeaderCell,
                            styles.tableBreakdownCell,
                          ]}
                        >
                          現金
                        </Text>
                        <Text
                          style={[
                            styles.tableHeaderCell,
                            styles.tableBreakdownCell,
                          ]}
                        >
                          株式
                        </Text>
                      </View>
                      {/* データ行 */}
                      <FlatList
                        data={chartPoints}
                        keyExtractor={(item) => item.monthKey}
                        renderItem={({ item: currentPoint }) => {
                          const currentBreakdown = getOrderedBreakdownEntries(
                            currentPoint.breakdown || {}
                          );
                          const currentCash =
                            currentBreakdown.find((b) => b.key === 'cash')
                              ?.value || 0;
                          const currentStock =
                            currentBreakdown.find((b) => b.key === 'stock')
                              ?.value || 0;

                          return (
                            <View style={styles.tableRow}>
                              <Text
                                style={[styles.tableCell, styles.tableDateCell]}
                              >
                                {safeFormatYearMonthLabel(currentPoint.x)}
                              </Text>
                              {userBirthDate && (
                                <Text
                                  style={[
                                    styles.tableCell,
                                    styles.tableAgeCell,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {buildAgeText(
                                    currentPoint.x instanceof Date
                                      ? currentPoint.x
                                      : new Date(currentPoint.x)
                                  )}
                                </Text>
                              )}
                              <Text
                                style={[
                                  styles.tableCell,
                                  styles.tableAmountCell,
                                ]}
                              >
                                {formatCurrency(currentPoint.y)}
                              </Text>
                              <Text
                                style={[
                                  styles.tableCell,
                                  styles.tableBreakdownCell,
                                ]}
                              >
                                {formatCurrency(currentCash)}
                              </Text>
                              <Text
                                style={[
                                  styles.tableCell,
                                  styles.tableBreakdownCell,
                                ]}
                              >
                                {formatCurrency(currentStock)}
                              </Text>
                            </View>
                          );
                        }}
                        scrollEnabled={false}
                      />
                    </View>
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataTitle}>
                    データが取得できませんでした
                  </Text>
                  <Text style={styles.noDataMessage}>
                    ネットワーク環境を確認し、再度お試しください。
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 資産別変化セクション */}
          {assetDetails.length > 0 && (
            <View style={styles.assetChangesSection}>
              <Text style={styles.sectionTitle}>内訳の変化</Text>
              <Text style={styles.sectionSubtitle}>
                更新で変更された各資産の詳細
              </Text>
              <View style={styles.assetChangesList}>
                {assetDetails.map((detail) => {
                  const targetAgeBalance = detail.asset_id
                    ? assetTargetAgeBalances.get(detail.asset_id) ?? null
                    : null;
                  return (
                    <AssetChangeCard
                      key={detail.id}
                      detail={detail}
                      formatNumber={formatNumber}
                      targetAge={targetAge}
                      targetMonth={targetMonth}
                      targetAgeBalance={targetAgeBalance}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* 削除ボタン（履歴詳細表示時のみ） */}
          {!(isNewResult || isFromOnboarding) && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Trash2 size={20} color={Colors.accent.error[500]} />
                <Text style={styles.deleteButtonText}>
                  {deleting ? '削除中...' : '削除'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* 固定フッター（新規結果・オンボーディング時） */}
        {(isNewResult || isFromOnboarding) && (
          <View style={styles.fixedFooter}>
            {user?.is_anonymous === true && isFromOnboarding ? (
              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => {
                  router.push('/auth/signup?fromOnboarding=true');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.signupButtonText}>
                  アカウントを作成
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => {
                  if (isFromOnboarding) {
                    router.replace('/(tabs)?showNotificationModal=true');
                  } else {
                    router.replace('/(tabs)/home');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.completeButtonText}>ホームに戻る</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  headerDateBadge: {
    // 背景色などは削除
  },
  headerDateText: {
    fontSize: 13,
    color: Colors.semantic.text.tertiary,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 12,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: Colors.semantic.button.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  fixedFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  skeletonActivePointCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
  },
  skeletonActivePointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: Colors.semantic.border,
    marginVertical: 8,
  },
  skeletonActivePointBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
  },
  skeletonBar: {
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.base.gray200,
  },
  skeletonContainer: {
    marginTop: 8,
  },
  skeletonLegendRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  skeletonLegendItem: {
    width: 52,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.base.gray200,
  },
  skeletonGraph: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: Colors.base.gray100,
  },
  actionContainer: {
    marginTop: 24,
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.border,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  dateText: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  // mainCard関連のスタイルを削除
  // mainCard: { ... },
  // cardHeader: { ... },
  // cardTitle: { ... },
  // resultContainer: { ... },
  // resultRow: { ... },
  // resultLabel: { ... },
  // resultValue: { ... },
  // futureValue: { ... },
  // increaseContainer: { ... },
  // increaseLabel: { ... },
  // increaseValue: { ... },

  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  graphSection: {
    marginBottom: 32,
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  detailLabel: {
    fontSize: 16,
    color: Colors.semantic.text.secondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  assetChangesSection: {
    marginTop: 32,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.semantic.button.primary,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.semantic.text.secondary,
  },
  graphSubtitle: {
    fontSize: 12,
    color: Colors.semantic.text.tertiary,
    marginBottom: 12,
  },
  rangeTabRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  rangeTabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.semantic.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    padding: 2,
  },
  rangeTab: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rangeTabActive: {
    backgroundColor: Colors.primary[500],
  },
  rangeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
  rangeTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  noDataContainer: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
    marginBottom: 8,
  },
  noDataMessage: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.semantic.text.secondary,
    marginBottom: 20,
  },
  assetChangesList: {
    gap: 0, // AssetChangeCardが独自にmarginBottomを持っているため
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent.error[500],
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent.error[500],
  },
  activePointInfoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.semantic.border,
    shadowColor: Colors.base.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 4,
  },
  activePointHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
    paddingBottom: 6,
    alignItems: 'flex-start',
  },
  dateAndAgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  activePointDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  ageBadge: {
    marginLeft: 8,
    flexShrink: 0,
  },
  ageText: {
    fontSize: 13,
    color: Colors.semantic.text.secondary,
    fontWeight: '500',
  },
  activePointBody: {
    flexDirection: 'column',
    gap: 12,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 24,
  },
  currentTotalContainer: {
    alignItems: 'flex-start',
    minWidth: 160,
  },
  currentLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  breakdownContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
  previousRow: {
    marginTop: 4,
  },
  previousDivider: {
    height: 1,
    backgroundColor: Colors.semantic.border,
    marginBottom: 8,
  },
  previousInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activePointSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.text.primary,
  },
  activePointSectionLabelSecondary: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.semantic.text.tertiary,
  },
  activePointTotal: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.semantic.text.primary,
    letterSpacing: -0.5,
  },
  activePointTotalSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.text.tertiary,
  },
  pointDiffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  pointDiffPositive: {
    backgroundColor: Colors.accent.success[50],
  },
  pointDiffNegative: {
    backgroundColor: Colors.accent.error[50],
  },
  pointDiffText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  pointDiffTextPositive: {
    color: Colors.accent.success[700],
  },
  pointDiffTextNegative: {
    color: Colors.accent.error[700],
  },
  activePointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePointRowLabel: {
    fontSize: 11,
    color: Colors.semantic.text.secondary,
  },
  activePointRowLabelSecondary: {
    color: Colors.semantic.text.tertiary,
  },
  activePointRowValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.semantic.text.primary,
  },
  activePointRowValueSecondary: {
    color: Colors.semantic.text.tertiary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: Colors.semantic.surface,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.semantic.text.secondary,
  },
  activeTabText: {
    color: Colors.semantic.text.inverse,
  },
  tableSection: {
    marginHorizontal: 0,
    marginBottom: 32,
  },
  tableContainer: {
    backgroundColor: Colors.semantic.background,
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.text.secondary,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.border,
  },
  tableCell: {
    fontSize: 14,
    color: Colors.semantic.text.primary,
    paddingHorizontal: 8,
  },
  tableDateCell: {
    width: 100,
  },
  tableAgeCell: {
    width: 120,
  },
  tableAmountCell: {
    width: 100,
    fontWeight: '600',
  },
  tableBreakdownCell: {
    width: 100,
  },
  tableCellPositive: {
    color: Colors.accent.success[600],
  },
  tableCellNegative: {
    color: Colors.accent.error[600],
  },
});
