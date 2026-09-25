import { useRef } from "react";
import {
    Animated,
    Pressable,
    PressableProps,
    StyleProp,
    ViewStyle,
} from "react-native";

type Props = Omit<PressableProps, "style" | "children"> & {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// A single animated Pressable rather than a Pressable wrapping a separately
// styled Animated.View. That two-element version broke flex layouts (e.g.
// two buttons meant to split a row 50/50 via flex: 1) because the style
// with flex:1 only ever reached the inner element, not the Pressable that
// the parent row actually lays out. Animating the Pressable directly keeps
// layout and animation on the same element.
const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
