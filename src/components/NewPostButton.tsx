import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { AnimatedPressable } from "./AnimatedPressable";

export function NewPostButton() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <AnimatedPressable
      onPress={() => router.push("/new-post")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingLeft: 4 }}
      scaleTo={0.85}
    >
      <Ionicons name="add-circle-outline" size={26} color={colors.text} />
    </AnimatedPressable>
  );
}
