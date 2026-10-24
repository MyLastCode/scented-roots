import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LEGAL_DOCS, TERMS_VERSION } from "../constants/legal";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

// Opened with /legal?doc=terms or /legal?doc=privacy
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const legalDoc = LEGAL_DOCS[doc === "privacy" ? "privacy" : "terms"];

  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <Stack.Screen options={{ title: legalDoc.title }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>{legalDoc.title}</Text>
        <Text style={styles.updated}>Last updated {TERMS_VERSION}</Text>

        {legalDoc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60 },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: colors.text,
    },
    updated: {
      fontSize: 13,
      color: colors.tertiaryText,
      marginTop: 4,
      marginBottom: 12,
    },
    section: { marginTop: 20 },
    heading: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.secondaryText,
    },
  });
}   