import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

const ITEM_WIDTH = 96;
const ITEM_HEIGHT = 52;
const VISIBLE_SIDE_ITEMS = 2; // 中央の左右に見えるアイテム数

interface HorizontalScrollPickerProps {
  values: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  formatValue: (value: number) => string;
}

export function HorizontalScrollPicker({
  values,
  selectedValue,
  onValueChange,
  formatValue,
}: HorizontalScrollPickerProps) {
  const listRef = useRef<FlatList>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isScrollingRef = useRef(false);
  const currentIndexRef = useRef(0);

  const sidePadding = containerWidth > 0
    ? (containerWidth - ITEM_WIDTH) / 2
    : ITEM_WIDTH * VISIBLE_SIDE_ITEMS;

  const selectedIndex = useMemo(
    () => Math.max(0, values.indexOf(selectedValue)),
    [values, selectedValue]
  );

  // マウント時・selectedValue変更時に選択位置へスクロール
  useEffect(() => {
    if (containerWidth === 0 || isScrollingRef.current) return;
    currentIndexRef.current = selectedIndex;
    listRef.current?.scrollToOffset({
      offset: selectedIndex * ITEM_WIDTH,
      animated: false,
    });
  }, [selectedIndex, containerWidth]);

  const snapToIndex = useCallback(
    (offset: number) => {
      const index = Math.round(offset / ITEM_WIDTH);
      const clamped = Math.max(0, Math.min(index, values.length - 1));
      currentIndexRef.current = clamped;
      onValueChange(values[clamped]);
    },
    [values, onValueChange]
  );

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrollingRef.current = false;
      snapToIndex(e.nativeEvent.contentOffset.x);
    },
    [snapToIndex]
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapToIndex(e.nativeEvent.contentOffset.x);
    },
    [snapToIndex]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => {
      const isSelected = item === selectedValue;
      return (
        <View style={styles.item}>
          <Text
            style={[styles.itemText, isSelected && styles.selectedItemText]}
            numberOfLines={1}
          >
            {formatValue(item)}
          </Text>
        </View>
      );
    },
    [selectedValue, formatValue]
  );

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* 選択インジケーター（中央の枠） */}
      {containerWidth > 0 && (
        <View
          style={[
            styles.indicator,
            { left: (containerWidth - ITEM_WIDTH) / 2 },
          ]}
          pointerEvents="none"
        />
      )}

      <FlatList
        ref={listRef}
        data={values}
        renderItem={renderItem}
        keyExtractor={(item) => item.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        getItemLayout={getItemLayout}
        windowSize={10}
        initialNumToRender={VISIBLE_SIDE_ITEMS * 2 + 1}
        maxToRenderPerBatch={10}
      />

      {/* 左フェード */}
      {containerWidth > 0 && (
        <LinearGradient
          colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeLeft, { width: sidePadding }]}
          pointerEvents="none"
        />
      )}

      {/* 右フェード */}
      {containerWidth > 0 && (
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeRight, { width: sidePadding }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT - 8,
    borderRadius: 10,
    backgroundColor: Colors.base.gray100,
    borderWidth: 1.5,
    borderColor: Colors.primary[200] ?? Colors.semantic.border,
  },
  item: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 14,
    color: Colors.semantic.text.tertiary,
    fontWeight: '400',
    textAlign: 'center',
  },
  selectedItemText: {
    fontSize: 17,
    color: Colors.semantic.text.primary,
    fontWeight: '700',
  },
  fade: {
    position: 'absolute',
    top: 0,
    height: ITEM_HEIGHT,
    zIndex: 2,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
});
