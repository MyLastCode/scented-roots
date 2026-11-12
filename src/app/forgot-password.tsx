import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { auth } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useTheme } from "../context/ThemeContext";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSend = async () => {
    const address = email.trim();
    if (!address) return setError("Enter the email you signed up with.");
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, address);
      setSentTo(address);
    } catch (e) {
      const code = (e as FirebaseError).code;
      if (code === "auth/invalid-email") {
        setError("That doesn't look like a valid email address.");
      } else if (code === "auth/user-not-found") {
        // Only reachable if email enumeration protection is off. Show the
        // same success state so we don't reveal which emails have accounts.
        setSentTo(address);
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError("Couldn't send the email. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accentBackground }]}>
          <Ionicons name="mail-outline" size={36} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text, textAlign: "center" }]}>
          Check your inbox
        </Text>
        <Text style={[styles.body, { color: colors.secondaryText, textAlign: "center" }]}>
          If an account exists for{" "}
          <Text style={{ color: colors.text, fontWeight: "600" }}>{sentTo}</Text>,
          we&apos;ve sent a link to reset your password. It may take a minute to
          arrive, so check your spam folder too.
        </Text>
        <View style={styles.actions}>
          <Button title="Back to Log In" onPress={() => router.back()} />
          <Button
            title="Resend email"
            variant="outline"
            onPress={handleSend}
            loading={loading}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
      <Text style={[styles.body, { color: colors.secondaryText }]}>
        Enter the email you signed up with and we&apos;ll send you a link to
        choose a new password.
      </Text>
      <TextField
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        autoFocus
        error={error}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      <Button title="Send Reset Link" onPress={handleSend} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20, paddingTop: 28, gap: 14 },
  centered: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 14 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 21 },
  actions: { alignSelf: "stretch", gap: 10, marginTop: 10 },
});
