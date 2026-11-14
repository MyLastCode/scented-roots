import { useEffect, useState } from "react";
import { Animated } from "react-native";

// Wrap a FlatList renderItem's returned element in this to get a gentle
// fade + slight rise as it mounts. Pass `index` for a staggered feel across
// a grid or list — delay is capped so long lists don't feel sluggish.
export function FadeInItem({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: any;
}) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(8));

  useEffect(() => {
    const delay = Math.min(index * 40, 240);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
