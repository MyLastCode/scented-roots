import { Image, ImageStyle, StyleProp } from "react-native";
import { useTheme } from "../context/ThemeContext";

// Dark bottle on white (light mode), light bottle on black (dark mode).
const BOTTLE_LIGHT = require("../../assets/images/default-bottle-light.png");
const BOTTLE_DARK = require("../../assets/images/default-bottle-dark.png");

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
};

export default function FragranceImage({ uri, style }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }

  return (
    <Image
      source={isDark ? BOTTLE_DARK : BOTTLE_LIGHT}
      style={[style, { backgroundColor: isDark ? "#000000" : "#ffffff" }]}
      resizeMode="contain"
    />
  );
}