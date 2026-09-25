import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { ThemeColors } from "../constants/theme";

export function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  colors,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  colors: ThemeColors;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.divider,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: { overflow: "hidden" },
});
