import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { PressableScale } from "../../components/PressableScale";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchCollection,
  Fragrance,
  getCachedCollection,
  Profile,
} from "../../services/collectionCache";
import  FragranceImage  from "../../components/FragranceImage";

const GRID_COLUMNS = 3;
const GRID_GAP = 10;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - 40 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);

export default function CollectionScreen() {
  const router = useRouter();
  // Start from the cache so the screen paints instantly on revisit.
  const initial = getCachedCollection();
  const [fragrances, setFragrances] = useState<Fragrance[]>(
    initial?.fragrances ?? [],
  );
  const [profile, setProfile] = useState<Profile | null>(
    initial?.profile ?? null,
  );
  // Only show the spinner when there is nothing cached yet.
  const [loading, setLoading] = useState(!initial);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCollection();
      if (data) {
        setFragrances(data.fragrances);
        setProfile(data.profile);
      }
    } catch (error) {
      console.error("Error loading collection:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const countLabel =
    fragrances.length === 1 ? "1 fragrance" : `${fragrances.length} fragrances`;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={styles.loadingText}>Loading your collection…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={fragrances}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={
        fragrances.length > 0
          ? { gap: GRID_GAP, marginBottom: GRID_GAP }
          : undefined
      }
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.profileRow}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="person-outline"
                  size={32}
                  color={colors.tertiaryText}
                />
              </View>
            )}
            <View style={styles.profileStats}>
              <Text style={styles.displayName} numberOfLines={1}>
                {profile?.displayName || "Add your name"}
              </Text>
              <Text style={styles.statCount}>{countLabel}</Text>
            </View>
          </View>

          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>
              Add a short bio to introduce your collection.
            </Text>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/profile")}
            >
              <Text style={styles.secondaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/add-fragrance")}
            >
              <Text style={styles.primaryButtonText}>+ Add Fragrance</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridDivider} />
        </Animated.View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons
            name="flask-outline"
            size={40}
            color={colors.tertiaryText}
          />
          <Text style={styles.emptyTitle}>Your collection is empty</Text>
          <Text style={styles.emptyText}>
            Add your first fragrance to start building your collection.
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
       <Animated.View
  entering={FadeInDown.delay(Math.min(index, 12) * 50).duration(350)}
  style={styles.gridImage}
>
  <PressableScale onPress={() => router.push(`../detail/${item.id}`)}>
    <FragranceImage uri={item.photoURL} style={styles.gridImage} />
  </PressableScale>
</Animated.View>
      )}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    
    loadingText: {
      marginTop: 12,
      color: colors.secondaryText,
      fontSize: 14,
    },
    listContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    profileStats: { marginLeft: 16, flex: 1 },
    displayName: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 22,
      color: colors.text,
    },
    statCount: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 4,
    },
    bio: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    bioPlaceholder: {
      fontSize: 14,
      color: colors.tertiaryText,
      fontStyle: "italic",
      lineHeight: 20,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 20,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.text,
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    gridDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: GRID_GAP,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingTop: 40,
    },
    emptyTitle: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 20,
      color: colors.text,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },
    gridItem: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
    }, 

   gridImage: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    gridImagePlaceholder: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    gridName: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 4,
      textAlign: "center",
    },
  });
}