import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../components/ui/Button";
import { useTheme } from "../context/ThemeContext";
import { TERMS_ACCEPTED_KEY } from "./signup";

// PLACEHOLDER COPY: have this reviewed (or generated with a tool such as the
// iubenda connector) before you publish the app.
const SECTIONS = [
  {
    title: "1. Using Scented Roots",
    body: "Scented Roots lets you catalog fragrances, share posts, and follow other collectors. You are responsible for the content you post and for keeping your account secure.",
  },
  {
    title: "2. Your content",
    body: "You keep ownership of the photos and captions you share. By posting, you let us display them to other users inside the app.",
  },
  {
    title: "3. Community guidelines",
    body: "Be respectful. Do not post spam, harassment, or content you do not have the right to share. We may remove posts that break these rules.",
  },
  {
    title: "4. Data and privacy",
    body: "We store your profile, collection, and posts to run the app. We never sell your personal data. See the Privacy Policy for details on what we collect and how to delete it.",
  },
  {
    title: "5. Changes",
    body: "We may update these terms. If we make a significant change, we will let you know in the app.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleAccept = async () => {
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, "1");
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.updated, { color: colors.tertiaryText }]}>
          Last updated October 2026
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={{ gap: 6 }}>
            <Text style={[styles.heading, { color: colors.text }]}>
              {s.title}
            </Text>
            <Text style={[styles.body, { color: colors.secondaryText }]}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.card, borderTopColor: colors.divider },
        ]}
      >
        <Button title="Accept & Continue" onPress={handleAccept} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 18 },
  updated: { fontSize: 12 },
  heading: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 21 },
  bottomBar: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
