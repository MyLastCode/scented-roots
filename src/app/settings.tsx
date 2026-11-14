import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { auth } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import { radii } from "../constants/theme";
import { ThemePreference, useTheme } from "../context/ThemeContext";

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            // The root layout's auth listener redirects to /login once the
            // user becomes null, so no navigation is needed here.
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Appearance</Text>

      <View style={[styles.toggleRow, { borderColor: colors.border }]}>
        {THEME_OPTIONS.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                { backgroundColor: selected ? colors.accent : colors.card },
              ]}
              onPress={() => setPreference(option.value)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: selected ? colors.onAccent : colors.text,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.text }]}>Privacy</Text>
      <View style={[styles.linkGroup, { borderColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.linkRow,
            { backgroundColor: pressed ? colors.divider : colors.card },
          ]}
          onPress={() => router.push("/blocked")}
        >
          <Text style={[styles.linkText, { color: colors.text }]}>
            Blocked collectors
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.tertiaryText} />
        </Pressable>
      </View>

      <View style={styles.spacer} />
      <Button title="Log Out" variant="danger" onPress={handleLogout} />
      <Button
        title="Delete Account"
        variant="outline"
        onPress={() => router.push("/delete-account")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 28, gap: 12 },
  sectionLabel: { fontSize: 16, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: 20,
  },
  option: { flex: 1, paddingVertical: 11, alignItems: "center" },
  linkGroup: {
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkText: { fontSize: 15 },
  spacer: { height: 16 },
});
