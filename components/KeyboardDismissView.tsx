import React from 'react';
import {
  TouchableWithoutFeedback,
  Keyboard,
  View,
  ViewProps,
} from 'react-native';

/**
 * キーボード制御機能付きのViewコンポーネント
 *
 * 使用方法:
 * <KeyboardDismissView style={styles.container}>
 *   <Text>コンテンツ</Text>
 * </KeyboardDismissView>
 */
interface KeyboardDismissViewProps extends ViewProps {
  children: React.ReactNode;
}

export default function KeyboardDismissView({
  children,
  style,
  ...props
}: KeyboardDismissViewProps) {
  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      accessible={false}
      importantForAccessibility="no"
    >
      <View style={style} {...props}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
}
