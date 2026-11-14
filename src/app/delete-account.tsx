import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { authErrorMessage } from "../lib/authErrors";
import { deleteAccount } from "../lib/deleteAccount";

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const runDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount(password);
      // The root layout notices the signed-out state and opens Login.
      Alert.alert("Account deleted", "Your account and data have been removed.");
    } catch (e) {
      console.error("Error deleting account:", e);
      const code = e instanceof FirebaseError ? e.code : "";
      setError(
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "That password is incorrect."
          : authErrorMessage(
              e,
              "Couldn't delete your account. Check your connection and try again.",
            ),
      );
      setDeleting(false);
    }
  };

  const confirm = () => {
    if (!password) return setError("Enter your password to continue.");
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account and everything you've added. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: runDelete },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>This can&apos;t be undone</Text>
      <Text style={styles.body}>Deleting your account permanently removes:</Text>
      <View style={styles.list}>
        {[
          "Your profile, followers and following",
          "Your fragrance collection",
          "Your posts, and all comments on them",
          "Comments you've left on other posts",
        ].map((line) => (
          <Text key={line} style={styles.body}>
            {"• "}
            {line}
          </Text>
        ))}
      </View>
      <Text style={styles.body}>Enter your password to confirm it&apos;s you.</Text>

      <TextField
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        error={error}
      />

      <Button
        title="Delete my account"
        variant="danger"
        onPress={confirm}
        loading={deleting}
        disabled={deleting}
      />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingTop: 28, gap: 14 },
    title: { fontSize: 20, fontWeight: "700", color: colors.text },
    body: { fontSize: 15, color: colors.secondaryText, lineHeight: 22 },
    list: { gap: 4, paddingLeft: 4 },
  });
}
