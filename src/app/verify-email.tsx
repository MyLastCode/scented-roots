import { useRouter } from "expo-router";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const user = auth.currentUser;

  // Re-reads the user from Firebase, because emailVerified does not update on
  // its own after the person taps the link in their inbox.
  const checkVerified = useCallback(
    async (silent: boolean) => {
      const current = auth.currentUser;
      if (!current) return;

      setChecking(true);
      try {
        await current.reload();
        if (current.emailVerified) {
          // Refresh the ID token so security rules that check
          // email_verified see the new value.
          await current.getIdToken(true);
          router.replace("/feed");
        } else if (!silent) {
          Alert.alert(
            "Not verified yet",
            "Open the link in the email we sent you, then come back and try again.",
          );
        }
      } catch (error: any) {
        if (!silent) Alert.alert("Error", error.message);
      } finally {
        setChecking(false);
      }
    },
    [router],
  );

  // Check automatically when the person returns to the app from their mail app.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkVerified(true);
    });
    return () => subscription.remove();
  }, [checkVerified]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!user) return;
    setSending(true);
    try {
      await sendEmailVerification(user);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      Alert.alert("Email sent", `We sent a new link to ${user.email}.`);
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        Alert.alert(
          "Too many requests",
          "Please wait a few minutes before asking for another email.",
        );
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The root layout's auth listener redirects to /login.
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>
        We sent a verification link to{" "}
        <Text style={styles.email}>{user?.email}</Text>. Open it, then come
        back here. Check your spam folder if you don't see it.
      </Text>

      <View style={styles.buttonWrapper}>
        <Button
          title={checking ? "Checking..." : "I've verified my email"}
          onPress={() => checkVerified(false)}
          disabled={checking}
          color={colors.accent}
        />
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleResend}
        disabled={sending || cooldown > 0}
      >
        <Text
          style={[
            styles.secondaryButtonText,
            (sending || cooldown > 0) && styles.disabledText,
          ]}
        >
          {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.toggle} onPress={handleLogout}>
        Use a different account
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 100,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      marginBottom: 16,
      color: colors.text,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.secondaryText,
      marginBottom: 28,
    },
    email: { color: colors.text, fontWeight: "600" },
    buttonWrapper: { marginBottom: 12 },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    disabledText: { color: colors.tertiaryText },
    toggle: { marginTop: 24, color: colors.accent, textAlign: "center" },
  });
}