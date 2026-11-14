import { Modal, Pressable, StyleSheet, Text } from "react-native";
import { radii, ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export type ActionSheetOption = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export type ActionSheetConfig = {
  title?: string;
  options: ActionSheetOption[];
};

// A simple bottom sheet of choices. Pass `config` to show it, null to hide.
// (Android's Alert only allows three buttons, which isn't enough for menus
// like the report reasons.)
export function ActionSheet({
  config,
  onClose,
}: {
  config: ActionSheetConfig | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={config !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stops taps on the sheet itself from closing it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {config?.title ? <Text style={styles.title}>{config.title}</Text> : null}
          {config?.options.map((option) => (
            <Pressable
              key={option.label}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              onPress={() => {
                // Close first, so an option can open a follow-up sheet.
                onClose();
                option.onPress();
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  option.destructive && { color: colors.error },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.option,
              styles.cancel,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={[styles.optionText, { fontWeight: "600" }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 34,
    },
    title: {
      fontSize: 13,
      color: colors.secondaryText,
      textAlign: "center",
      paddingVertical: 10,
    },
    option: {
      paddingVertical: 15,
      alignItems: "center",
      borderRadius: radii.md,
    },
    pressed: { backgroundColor: colors.divider },
    cancel: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    optionText: { fontSize: 16, color: colors.text },
  });
}
