import React, { ReactNode, useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/use-theme';
import { Text } from './Text';
import { AppIcon } from './AppIcon';
import { Radius, Spacing } from '../../constants/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ visible, onClose, children, title }: BottomSheetProps) {
  const { theme } = useTheme();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  // Sobe o sheet acima do teclado para os campos não ficarem cobertos.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0),
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250, easing: Easing.in(Easing.ease) });
    }
  }, [visible, overlayOpacity, translateY]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  function handleClose() {
    Keyboard.dismiss();
    overlayOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(
      SHEET_HEIGHT,
      { duration: 250, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      }
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { paddingBottom: keyboardHeight }]}>
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height:
                keyboardHeight > 0
                  ? Math.min(SHEET_HEIGHT, SCREEN_HEIGHT - keyboardHeight - 24)
                  : SHEET_HEIGHT,
              backgroundColor: theme.colors.surfaceElevated,
            },
            sheetAnimatedStyle,
          ]}
        >
          <View style={styles.dragIndicator} />

          {title && (
            <View style={styles.header}>
              <Text variant="headline" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={10}
                style={[styles.closeBtn, { backgroundColor: theme.colors.surface }]}
                accessibilityLabel="Fechar"
              >
                <AppIcon name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingTop: Spacing[2],
    overflow: 'hidden',
  },
  dragIndicator: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: Spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
});
