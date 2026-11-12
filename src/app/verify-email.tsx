import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { reload, sendEmailVerification, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { auth } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import { useTheme } from "../context/ThemeContext";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const email = auth.currentUser?.email ?? "your email";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerified = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setChecking(true);
    try {
      // onAuthStateChanged doesn't fire when emailVerified flips, so refresh
      // the user manually and navigate ourselves.
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        router.replace("/feed");
      } else {
        Alert.alert(
          "Not verified yet",
          "Open the link in the email we sent, then try again.",
        );
      }
    } catch (e: any) {
      Alert.alert("Something went wrong", e.message);
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user || cooldown > 0) return;
    try {
      await sendEmailVerification(user);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      Alert.alert("Email sent", "Check your inbox (and spam folder).");
    } catch (e: any) {
      Alert.alert("Couldn't send email", e.message);
    }
  };

  const formatCooldown = `0:${String(cooldown).padStart(2, "0")}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.accentBackground },
        ]}
      >
        <Ionicons name="mail-outline" size={48} color={colors.accent} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        Verify your email
      </Text>
      <Text style={[styles.body, { color: colors.secondaryText }]}>
        We sent a verification link to {email}. Open it, then come back here to
        continue.
      </Text>

      <View style={styles.buttonWrap}>
        <Button
          title="I've verified my email"
          onPress={handleVerified}
          loading={checking}
        />
      </View>

      <Text
        style={[
          styles.resend,
          { color: cooldown > 0 ? colors.tertiaryText : colors.accent },
        ]}
        onPress={handleResend}
      >
        Resend email
      </Text>
      {cooldown > 0 ? (
        <Text style={[styles.hint, { color: colors.tertiaryText }]}>
          You can request another link in {formatCooldown}
        </Text>
      ) : null}

      <Text
        style={[styles.switch, { color: colors.secondaryText }]}
        onPress={() => signOut(auth)}
      >
        Use a different account
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  buttonWrap: { alignSelf: "stretch", marginTop: 8 },
  resend: { fontSize: 15, fontWeight: "600" },
  hint: { fontSize: 13, marginTop: -8 },
  switch: { fontSize: 14, marginTop: 8 },
});
