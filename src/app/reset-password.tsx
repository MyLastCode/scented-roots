import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FirebaseError } from "firebase/app";
import {
  applyActionCode,
  reload,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useTheme } from "../context/ThemeContext";
import {
  PasswordReuseError,
  resetPasswordWithoutReuse,
} from "../lib/passwordReset";
import { PASSWORD_HINT, passwordProblem } from "../lib/passwordRules";

// Custom Firebase email action handler. Firebase appends
// ?mode=...&oobCode=... to the action URL set in the console, and that URL is
// shared by every auth email template, so verification links land here too.
type Status = "verifying" | "invalid" | "ready" | "done" | "verified";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { oobCode, mode } = useLocalSearchParams<{
    oobCode?: string;
    mode?: string;
  }>();

  const [status, setStatus] = useState<Status>(
    oobCode ? "verifying" : "invalid",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!oobCode) return;
    if (mode === "verifyEmail") {
      applyActionCode(auth, oobCode)
        .then(async () => {
          // Refresh a signed-in user so the root layout sees emailVerified.
          if (auth.currentUser) await reload(auth.currentUser);
          setStatus("verified");
        })
        .catch(() => setStatus("invalid"));
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((address) => {
        setEmail(address);
        setStatus("ready");
      })
      .catch(() => setStatus("invalid"));
  }, [oobCode, mode]);

  const handleSave = async () => {
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords don't match.");
    setError(null);
    setSaving(true);
    try {
      await resetPasswordWithoutReuse(oobCode!, email, password);
      setStatus("done");
    } catch (e) {
      if (e instanceof PasswordReuseError) {
        setError(e.message);
      } else {
        const code = (e as FirebaseError).code;
        if (code === "auth/weak-password") {
          setError("That password is too weak. Try a longer one.");
        } else if (
          code === "auth/expired-action-code" ||
          code === "auth/invalid-action-code"
        ) {
          setStatus("invalid");
        } else if (code === "auth/too-many-requests") {
          setError("Too many attempts. Please wait a few minutes and try again.");
        } else {
          setError("Couldn't update your password. Please try again.");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const goToLogin = () => router.replace("/login");

  if (status === "verifying") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (status === "verified") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accentBackground }]}>
          <Ionicons name="checkmark-circle-outline" size={36} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text, textAlign: "center" }]}>
          Email verified
        </Text>
        <Text style={[styles.body, { color: colors.secondaryText, textAlign: "center" }]}>
          Thanks for confirming your email. You&apos;re all set.
        </Text>
        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={() =>
              router.replace(auth.currentUser?.emailVerified ? "/feed" : "/login")
            }
          />
        </View>
      </View>
    );
  }

  if (status === "invalid" || status === "done") {
    const done = status === "done";
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accentBackground }]}>
          <Ionicons
            name={done ? "checkmark-circle-outline" : "alert-circle-outline"}
            size={36}
            color={colors.accent}
          />
        </View>
        <Text style={[styles.title, { color: colors.text, textAlign: "center" }]}>
          {done ? "Password updated" : "Link expired"}
        </Text>
        <Text style={[styles.body, { color: colors.secondaryText, textAlign: "center" }]}>
          {done
            ? "You can now log in with your new password."
            : mode === "verifyEmail"
              ? "This verification link is invalid or has already been used. Log in to request a new one."
              : "This reset link is invalid or has already been used. Request a new one from the login screen."}
        </Text>
        <View style={styles.actions}>
          <Button title="Go to Log In" onPress={goToLogin} />
          {done || mode === "verifyEmail" ? null : (
            <Button
              title="Send a new link"
              variant="outline"
              onPress={() => router.replace("/forgot-password")}
            />
          )}
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
      <Text style={[styles.title, { color: colors.text }]}>Choose a new password</Text>
      <Text style={[styles.body, { color: colors.secondaryText }]}>
        For <Text style={{ color: colors.text, fontWeight: "600" }}>{email}</Text>.
        It must be different from your current password.
      </Text>
      <TextField
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        autoFocus
      />
      <TextField
        placeholder="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        error={error}
        onSubmitEditing={handleSave}
        returnKeyType="done"
      />
      <Button title="Update Password" onPress={handleSave} loading={saving} />
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
