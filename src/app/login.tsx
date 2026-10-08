import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { fonts } from "../constants/fonts";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await setDoc(doc(db, "users", cred.user.uid), {
          createdAt: new Date(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/feed");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.mark}>✦</Text>
          <Text style={styles.title}>Scented Roots</Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? "Start cataloguing your collection"
              : "Welcome back to your collection"}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={colors.tertiaryText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.tertiaryText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isSignUp ? "Create Account" : "Log In"}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.toggle} onPress={() => setIsSignUp(!isSignUp)}>
            {isSignUp
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 32,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: "center",
      marginBottom: 44,
    },
    mark: {
      fontSize: 20,
      color: colors.accent,
      marginBottom: 10,
    },
    title: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 32,
      color: colors.text,
      letterSpacing: 0.2,
    },
    subtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 8,
      textAlign: "center",
    },
    form: {
      width: "100%",
      maxWidth: 360,
      alignSelf: "center",
    },
    fieldGroup: {
      marginBottom: 22,
    },
    fieldLabel: {
      fontSize: 12,
      color: colors.tertiaryText,
      marginBottom: 6,
    },
    input: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
      fontSize: 17,
      color: colors.text,
    },
    submitButton: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    toggle: {
      marginTop: 22,
      color: colors.accent,
      textAlign: "center",
      fontSize: 14,
    },
  });
}
