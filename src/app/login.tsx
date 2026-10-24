import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { TERMS_VERSION } from "../constants/legal";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const openLegal = (docName: "terms" | "privacy") => {
    router.push({ pathname: "../legal", params: { doc: docName } });
  };

  const handleSubmit = async () => {
    if (isSignUp && !agreed) {
      Alert.alert(
        "Agreement required",
        "Please agree to the Terms of Service and Privacy Policy to create an account.",
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

        // Record what was accepted and when. merge: true so this never
        // overwrites profile fields saved on the same doc.
        await setDoc(
          doc(db, "users", credential.user.uid),
          {
            termsAcceptedAt: serverTimestamp(),
            termsVersion: TERMS_VERSION,
          },
          { merge: true },
        );

        await sendEmailVerification(credential.user);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // No navigation here. The root layout's auth listener sends the person
      // to /verify-email or the feed depending on emailVerified.
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? "Create Account" : "Log In"}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.tertiaryText}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.tertiaryText}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {isSignUp && (
        <View style={styles.consentRow}>
          <TouchableOpacity
            onPress={() => setAgreed(!agreed)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <Ionicons
              name={agreed ? "checkbox" : "square-outline"}
              size={24}
              color={agreed ? colors.accent : colors.tertiaryText}
            />
          </TouchableOpacity>
          <Text style={styles.consentText}>
            I agree to the{" "}
            <Text style={styles.link} onPress={() => openLegal("terms")}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={styles.link} onPress={() => openLegal("privacy")}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      )}

      <Button
        title={isSignUp ? "Sign Up" : "Log In"}
        onPress={handleSubmit}
        disabled={submitting || (isSignUp && !agreed)}
        color={colors.accent}
      />

      <Text style={styles.toggle} onPress={() => setIsSignUp(!isSignUp)}>
        {isSignUp
          ? "Already have an account? Log in"
          : "Don't have an account? Sign up"}
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
      marginBottom: 24,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 12,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    consentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    consentText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.secondaryText,
    },
    link: { color: colors.accent, fontWeight: "600" },
    toggle: { marginTop: 20, color: colors.accent, textAlign: "center" },
  });
}