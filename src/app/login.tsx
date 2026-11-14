import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { auth } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useTheme } from "../context/ThemeContext";
import { authErrorMessage } from "../lib/authErrors";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // The root layout's auth listener decides where to go (Feed, or
      // /verify-email if the address isn't verified yet).
    } catch (error) {
      Alert.alert(
        "Couldn't log in",
        authErrorMessage(error, "Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient colors={["#1E120C", "#D08A52"]} style={styles.hero}>
        <Ionicons
          name="flask-outline"
          size={120}
          color="rgba(255,255,255,0.25)"
          style={styles.heroIcon}
        />
        <Text style={styles.heroLabel}>MY COLLECTION</Text>
        <Text style={styles.heroTitle}>Curate your{"\n"}scent story.</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={[styles.title, { color: colors.text }]}>Log In</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Welcome back to your collection.
        </Text>

        <TextField
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextField
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Text
          style={[styles.forgot, { color: colors.accent }]}
          onPress={() =>
            router.push({
              pathname: "/forgot-password",
              params: email.trim() ? { email: email.trim() } : {},
            })
          }
          suppressHighlighting
        >
          Forgot password?
        </Text>

        <Button title="Log In" onPress={handleLogin} loading={loading} />

        <Text
          style={[styles.toggle, { color: colors.accent }]}
          onPress={() => router.push("/signup")}
        >
          Don&apos;t have an account? Sign up
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 340, padding: 24, justifyContent: "flex-end" },
  heroIcon: { position: "absolute", alignSelf: "center", top: 90 },
  heroLabel: {
    position: "absolute",
    top: 70,
    left: 24,
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
  },
  heroTitle: { color: "#fff", fontSize: 36, fontWeight: "700", lineHeight: 44 },
  form: { padding: 20, paddingTop: 28, gap: 14 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: -8 },
  toggle: { textAlign: "center", fontSize: 14, marginTop: 6 },
  forgot: {
    alignSelf: "flex-end",
    fontSize: 14,
    fontWeight: "600",
    marginTop: -4,
    paddingVertical: 4,
  },
});
