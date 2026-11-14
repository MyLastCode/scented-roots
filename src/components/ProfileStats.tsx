import { Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeColors } from "../constants/theme";

export function ProfileStats({
  fragranceCount,
  followerCount,
  followingCount,
  colors,
  onPressFollowers,
  onPressFollowing,
}: {
  fragranceCount: number;
  followerCount: number;
  followingCount: number;
  colors: ThemeColors;
  // When set, the Followers / Following counts become tappable.
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.number}>{fragranceCount}</Text>
        <Text style={styles.label}>Fragrances</Text>
      </View>
      <Pressable
        style={styles.item}
        onPress={onPressFollowers}
        disabled={!onPressFollowers}
        hitSlop={8}
        accessibilityRole={onPressFollowers ? "button" : undefined}
        accessibilityLabel={`${followerCount} followers`}
      >
        <Text style={styles.number}>{followerCount}</Text>
        <Text style={styles.label}>Followers</Text>
      </Pressable>
      <Pressable
        style={styles.item}
        onPress={onPressFollowing}
        disabled={!onPressFollowing}
        hitSlop={8}
        accessibilityRole={onPressFollowing ? "button" : undefined}
        accessibilityLabel={`${followingCount} following`}
      >
        <Text style={styles.number}>{followingCount}</Text>
        <Text style={styles.label}>Following</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    item: { alignItems: "center" },
    number: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    label: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
  });
}
