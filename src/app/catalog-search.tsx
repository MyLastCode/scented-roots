import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";  
import { Pressable } from "react-native";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

type CatalogFragrance = {
  id: string;
  name: string;
  brand: string;
  year: number | null;
  gender: string | null;
  notesTop: string[];
  notesMiddle: string[];
  notesBase: string[];
  accords: string[];
};

// How many matching results to render at once. The full catalog can still be
// searched — this just keeps the list snappy by not rendering thousands of
// rows when the search is broad.
const MAX_RESULTS_SHOWN = 50;

export default function CatalogSearchScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogFragrance[]>([]);
  const [searchText, setSearchText] = useState("");

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const q = query(
          collection(db, "fragrances"),
          where("status", "==", "approved"),
        );
        const snapshot = await getDocs(q);
        const items: CatalogFragrance[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            brand: data.brand || "",
            year: data.year ?? null,
            gender: data.gender ?? null,
            notesTop: data.notesTop || [],
            notesMiddle: data.notesMiddle || [],
            notesBase: data.notesBase || [],
            accords: data.accords || [],
          };
        });
        setCatalog(items);
      } catch (err) {
        console.error("Error loading catalog:", err);
        setError("Couldn't load the fragrance catalog. Pull to retry.");
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  const filteredResults = useMemo(() => {
    const trimmed = searchText.trim().toLowerCase();
    if (!trimmed) return [];

    return catalog
      .filter((item) => {
        const haystack = [
          item.name,
          item.brand,
          ...item.notesTop,
          ...item.notesMiddle,
          ...item.notesBase,
          ...item.accords,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(trimmed);
      })
      .slice(0, MAX_RESULTS_SHOWN);
  }, [searchText, catalog]);

  const formatNotes = (item: CatalogFragrance) => {
    const all = [...item.notesTop, ...item.notesMiddle, ...item.notesBase];
    if (all.length === 0) return "";
    return all.join(", ");
  };

  // Rather than saving immediately, hand off to a confirm screen so the user
  // can attach their own photo(s) before it lands in their collection.
  const handleSelect = (item: CatalogFragrance) => {
    router.push({
      pathname: "../add-from-catalog",
      params: {
        catalogId: item.id,
        name: item.name,
        brand: item.brand,
        notes: formatNotes(item),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading fragrance catalog…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search by name, brand, or note (e.g. Sauvage, Dior, vanilla)"
        placeholderTextColor={colors.tertiaryText}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {searchText.trim().length === 0 ? (
        <Text style={styles.hint}>
          Start typing to search {catalog.length.toLocaleString()} fragrances.
        </Text>
      ) : filteredResults.length === 0 ? (
        <Text style={styles.hint}>
          No matches. Try a different name, brand, or note — or add it manually
          instead.
        </Text>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultBrand}>
                  {item.brand}
                  {item.year ? ` · ${item.year}` : ""}
                </Text>
                {item.accords.length > 0 && (
                  <Text style={styles.resultAccords} numberOfLines={1}>
                    {item.accords.slice(0, 4).join(", ")}
                  </Text>
                )}
              </View>
              <Text style={styles.addLabel}>Add</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: colors.background,
    },
    loadingText: { marginTop: 12, color: colors.secondaryText },
    errorText: { color: colors.error, textAlign: "center" },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      marginBottom: 12,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    hint: { color: colors.tertiaryText, marginTop: 8 },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    resultText: { flex: 1, paddingRight: 12 },
    resultName: { fontSize: 16, fontWeight: "600", color: colors.text },
    resultBrand: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 2,
    },
    resultAccords: {
      fontSize: 12,
      color: colors.tertiaryText,
      marginTop: 4,
    },
    addLabel: { color: colors.accent, fontWeight: "600" },
  });
}
