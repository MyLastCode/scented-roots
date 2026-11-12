import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

type Props = {
  label: string;
  selected?: boolean;
  dotColor?: string;
  onPress?: () => void;
};

export default function Chip({
  label,
  selected = false,
  dotColor,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.accent }
          : { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: selected ? colors.onAccent : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
