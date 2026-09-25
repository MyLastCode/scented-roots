import { StyleSheet, Text, View } from "react-native";
import { ThemeColors } from "../constants/theme";

export function ProfileStats({
  fragranceCount,
  followerCount,
  followingCount,
  colors,
}: {
  fragranceCount: number;
  followerCount: number;
  followingCount: number;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.number}>{fragranceCount}</Text>
        <Text style={styles.label}>Fragrances</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.number}>{followerCount}</Text>
        <Text style={styles.label}>Followers</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.number}>{followingCount}</Text>
        <Text style={styles.label}>Following</Text>
      </View>
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
