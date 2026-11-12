import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useTheme } from "../context/ThemeContext";

// Set by terms.tsx when the user taps "Accept & Continue".
export const TERMS_ACCEPTED_KEY = "termsAcceptedDraft";

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If they read the terms and accepted, tick the box when they come back.
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(TERMS_ACCEPTED_KEY).then((value) => {
        if (value === "1") setAgreed(true);
      });
    }, []),
  );

  const handleSignUp = async () => {
    setError(null);
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    if (!agreed) return setError("Please agree to the Terms & Conditions.");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await sendEmailVerification(cred.user);

      // Record consent alongside the profile doc.
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          email: cred.user.email,
          displayName: "",
          bio: "",
          photoURL: null,
          termsAcceptedAt: serverTimestamp(),
        },
        { merge: true },
      );

      await AsyncStorage.removeItem(TERMS_ACCEPTED_KEY);
      router.replace("/verify-email");
    } catch (e: any) {
      Alert.alert("Couldn't create account", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient colors={["#1E120C", "#D08A52"]} style={styles.hero}>
        <Text style={styles.heroTitle}>Join Scented Roots</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={[styles.title, { color: colors.text }]}>
          Create Account
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
        />
        <TextField
          placeholder="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          error={error}
        />

        <View style={styles.termsRow}>
          <Pressable
            onPress={() => setAgreed(!agreed)}
            hitSlop={8}
            style={[
              styles.checkbox,
              agreed
                ? { backgroundColor: colors.accent }
                : { borderWidth: 1.5, borderColor: colors.border },
            ]}
          >
            {agreed ? (
              <Ionicons name="checkmark" size={15} color={colors.onAccent} />
            ) : null}
          </Pressable>
          <Text style={[styles.termsText, { color: colors.secondaryText }]}>
            I agree to the{" "}
            <Text
              style={{ color: colors.accent }}
              onPress={() => router.push("../terms")}
            >
              Terms & Conditions
            </Text>{" "}
            and{" "}
            <Text
              style={{ color: colors.accent }}
              onPress={() => router.push("../terms")}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>

        <Button title="Sign Up" onPress={handleSignUp} loading={loading} />

        <Text
          style={[styles.toggle, { color: colors.accent }]}
          onPress={() => router.replace("/login")}
        >
          Already have an account? Log in
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 230, padding: 24, justifyContent: "flex-end" },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "700" },
  form: { padding: 20, paddingTop: 22, gap: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  termsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: { flex: 1, fontSize: 13, lineHeight: 19 },
  toggle: { textAlign: "center", fontSize: 14, marginTop: 4 },
});
