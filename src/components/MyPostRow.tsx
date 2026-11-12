import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { radii } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import Button from "./ui/Button";

type Props = {
  caption: string;
  photoURL?: string | null;
  photoCount: number;
  likeCount?: number;
  commentCount: number;
  onPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function MyPostRow({
  caption,
  photoURL,
  photoCount,
  likeCount,
  commentCount,
  onPress,
  onEdit,
  onDelete,
}: Props) {
  const { colors } = useTheme();

  const meta = [
    `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
    likeCount !== undefined ? `${likeCount} likes` : null,
    `${commentCount} comments`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.divider },
      ]}
    >
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: colors.placeholder }]} />
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={[styles.caption, { color: colors.text }]}
          numberOfLines={1}
        >
          {caption}
        </Text>
        <Text
          style={[styles.meta, { color: colors.secondaryText }]}
          numberOfLines={1}
        >
          {meta}
        </Text>
        <View style={styles.buttons}>
          <Button
            title="Edit"
            variant="outline"
            size="sm"
            onPress={onEdit}
            icon={<Ionicons name="pencil" size={13} color={colors.text} />}
          />
          <Button
            title="Delete"
            variant="danger"
            size="sm"
            onPress={onDelete}
            icon={
              <Ionicons name="trash-outline" size={13} color={colors.error} />
            }
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: "center",
  },
  thumb: { width: 84, height: 84, borderRadius: radii.lg },
  caption: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12 },
  buttons: { flexDirection: "row", gap: 8, marginTop: 6 },
});
