import { signOut } from "firebase/auth";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../../firebaseConfig";
import { ThemeColors } from "../constants/theme";
import { ThemePreference, useTheme } from "../context/ThemeContext";

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = createStyles(colors);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            // The root layout's auth listener redirects to /login
            // automatically once the user becomes null — no navigation
            // needed here.
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Appearance</Text>
      <View style={styles.themeToggleRow}>
        {THEME_OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeOption,
                selected && styles.themeOptionSelected,
              ]}
              onPress={() => setPreference(option.value)}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  selected && styles.themeOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 40,
      backgroundColor: colors.background,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 10,
      color: colors.text,
    },
    themeToggleRow: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 32,
    },
    themeOption: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.card,
    },
    themeOptionSelected: {
      backgroundColor: colors.accent,
    },
    themeOptionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    themeOptionTextSelected: {
      color: "#ffffff",
    },
    logoutButton: {
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
    },
    logoutButtonText: {
      color: colors.error,
      fontWeight: "600",
      fontSize: 16,
    },
  });
}
