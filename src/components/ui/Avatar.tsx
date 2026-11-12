import { LinearGradient } from "expo-linear-gradient";
import { Image, Text } from "react-native";
import { gradientFor } from "../../constants/theme";

type Props = {
  name?: string | null;
  photoURL?: string | null;
  size?: number;
};

export default function Avatar({ name, photoURL, size = 48 }: Props) {
  const radius = size / 2;

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  const label = (name || "?").trim();
  return (
    <LinearGradient
      colors={gradientFor(label)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.42 }}>
        {label.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}
