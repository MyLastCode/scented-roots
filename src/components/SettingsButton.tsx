import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";

export function SettingsButton() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => router.push("/settings")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingRight: 4 }}
    >
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}
