import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";
import Avatar from "../../components/ui/Avatar";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { loadBlockedIds } from "../../lib/moderation";
import { openProfile } from "../../lib/navigation";

// Shows who follows a collector (?type=followers) or who they follow
// (?type=following). Opened by tapping the counts on a profile.

type Person = {
  id: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
};

const MAX_PEOPLE = 200;

export default function FollowListScreen() {
  const { id, type } = useLocalSearchParams<{
    id: string;
    type?: "followers" | "following";
  }>();
  const listType = type === "following" ? "following" : "followers";
  const navigation = useNavigation();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions({
      title: listType === "followers" ? "Followers" : "Following",
    });
  }, [navigation, listType]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // A follow doc is { followerId, followingId }. For "followers" we look
    // for docs pointing at this person and take the other side.
    const matchField = listType === "followers" ? "followingId" : "followerId";
    const otherField = listType === "followers" ? "followerId" : "followingId";

    Promise.all([
      getDocs(
        query(
          collection(db, "follows"),
          where(matchField, "==", id),
          limit(MAX_PEOPLE),
        ),
      ),
      loadBlockedIds(),
    ])
      .then(async ([followSnap, blocked]) => {
        const ids = followSnap.docs
          .map((d) => d.data()[otherField] as string)
          .filter((uid) => uid && !blocked.has(uid));
        const userSnaps = await Promise.all(
          ids.map((uid) => getDoc(doc(db, "users", uid))),
        );
        if (cancelled) return;
        setPeople(
          userSnaps
            // Skip accounts that have since been deleted.
            .filter((snap) => snap.exists())
            .map((snap) => ({
              id: snap.id,
              displayName: snap.data()?.displayName || "Unnamed Collector",
              bio: snap.data()?.bio || "",
              photoURL: snap.data()?.photoURL || null,
            })),
        );
      })
      .catch((error) => console.error("Error loading follow list:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, listType]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={people}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {listType === "followers"
            ? "No followers yet."
            : "Not following anyone yet."}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
          onPress={() => openProfile(item.id)}
          accessibilityRole="button"
        >
          <Avatar name={item.displayName} photoURL={item.photoURL} size={44} />
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>
              {item.displayName}
            </Text>
            {item.bio ? (
              <Text style={styles.bio} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
          </View>
        </Pressable>
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
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rowText: { marginLeft: 12, flex: 1, gap: 2 },
    name: { fontSize: 15, fontWeight: "600", color: colors.text },
    bio: { fontSize: 13, color: colors.secondaryText },
    emptyText: {
      fontSize: 14,
      color: colors.tertiaryText,
      textAlign: "center",
      marginTop: 32,
    },
  });
}
