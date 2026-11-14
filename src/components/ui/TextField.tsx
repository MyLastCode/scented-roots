import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { radii } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  // Helper text shown under the field when there's no error.
  hint?: string;
};

export default function TextField({
  label,
  error,
  hint,
  style,
  multiline,
  ...rest
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.tertiaryText}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.error : colors.border,
          },
          multiline && styles.multiline,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.error, { color: colors.secondaryText }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 15, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  error: { fontSize: 13 },
});
