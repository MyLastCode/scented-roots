import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { radii } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

type Variant = "primary" | "outline" | "soft" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: "md" | "sm";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const { colors } = useTheme();

  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: "transparent" },
    soft: { bg: colors.accentBackground, fg: colors.accent, border: "transparent" },
    outline: { bg: "transparent", fg: colors.text, border: colors.border },
    danger: { bg: "transparent", fg: colors.error, border: colors.error },
  }[variant];

  const small = size === "sm";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === "primary" || variant === "soft" ? 0 : 1,
          paddingVertical: small ? 7 : 14,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? 18 : variant === "soft" ? radii.lg : radii.pill,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            style={{
              color: palette.fg,
              fontSize: small ? 13 : 16,
              fontWeight: "600",
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
