import { useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    View,
} from "react-native";
import { ThemeColors } from "../constants/theme";

const CAROUSEL_WIDTH = Dimensions.get("window").width - 40;

export function PhotoCarousel({
  photos,
  colors,
}: {
  photos: string[];
  colors: ThemeColors;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setActiveIndex(index);
  };

  if (photos.length === 0) return null;

  const styles = createStyles(colors);

  return (
    <View style={{ marginBottom: 10 }}>
      <FlatList
        data={photos}
        keyExtractor={(url, i) => `${url}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.image} />
        )}
      />
      {photos.length > 1 && (
        <View style={styles.dotsRow}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    image: {
      width: CAROUSEL_WIDTH,
      height: CAROUSEL_WIDTH,
      borderRadius: 10,
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 8,
      gap: 5,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.divider,
    },
    dotActive: { backgroundColor: colors.accent },
  });
}
