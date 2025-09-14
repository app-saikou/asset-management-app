import { Keyboard } from 'react-native';

/**
 * キーボードを閉じる機能を提供するカスタムフック
 *
 * 使用方法:
 * const { dismissKeyboard, KeyboardDismissWrapper } = useKeyboardDismiss();
 *
 * return (
 *   <KeyboardDismissWrapper>
 *     <View>...</View>
 *   </KeyboardDismissWrapper>
 * );
 */
export const useKeyboardDismiss = () => {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const KeyboardDismissWrapper = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const { TouchableWithoutFeedback } = require('react-native');

    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        {children}
      </TouchableWithoutFeedback>
    );
  };

  return {
    dismissKeyboard,
    KeyboardDismissWrapper,
  };
};
