import { Image } from "expo-image";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";
import { fonts } from "../constants/fonts";

// In-app splash (Figma "Splash" frame). The native splash in app.json shows
// the same logo on the same black background, so the hand-off is seamless;
// this version adds the wordmark and tagline while auth state resolves.
export default function SplashScreen() {
  return (
    <Animated.View exiting={FadeOut.duration(300)} style={styles.container}>
      <Image
        source={require("../../assets/images/splash-logo.svg")}
        style={styles.logo}
        contentFit="contain"
      />
      <Text style={styles.title}>Scented Roots</Text>
      <Text style={styles.tagline}>Your collection, curated.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    zIndex: 10,
  },
  logo: { width: 104, height: 104 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 30, color: "#FFFFFF" },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
});
