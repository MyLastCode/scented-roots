import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { FadeInItem } from "../../components/FadeInItem";
import FragranceImage from "../../components/FragranceImage";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import Avatar from "../../components/ui/Avatar";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { loadBlockedIds } from "../../lib/moderation";
import {
  buildTasteProfile,
  capitalize,
  RecommendedFragrance,
  recommendFragrances,
  scentWords,
  scoreAgainst,
} from "../../lib/recommendations";

type DiscoverUser = {
  id: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
  followerCount: number;
  createdAt: { toDate: () => Date } | null;
  topNotes: string[];
  currentlyWearing: string | null;
  scentWords: Set<string>;
};

type SuggestedCollector = DiscoverUser & { reason: string | null };

const SUGGESTION_COUNT = 3;

const PAGE_SIZE = 50;
const FRAGRANCE_CHUNK_SIZE = 10; // Firestore "in" query limit we're targeting

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Splits comma-separated "notes" strings, tallies frequency, and returns the
// top N notes preserving their original (first-seen) casing for display.
function computeTopNotes(notesStrings: string[], topN: number): string[] {
  const tally = new Map<string, { count: number; display: string }>();
  notesStrings.forEach((str) => {
    str
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .forEach((note) => {
        const key = note.toLowerCase();
        const existing = tally.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          tally.set(key, { count: 1, display: note });
        }
      });
  });
  return Array.from(tally.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((n) => n.display);
}

function joinedTimeAgo(date: Date | null) {
  if (!date) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "Joined today";
  if (days === 1) return "Joined yesterday";
  if (days < 30) return `Joined ${days}d ago`;
  const months = Math.floor(days / 30);
  return `Joined ${months}mo ago`;
}

function DiscoverSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <SkeletonBlock width="100%" height={46} borderRadius={12} colors={colors} />
      <SkeletonBlock
        width="55%"
        height={18}
        colors={colors}
        style={{ marginTop: 24 }}
      />
      <View style={{ flexDirection: "row", marginTop: 14, gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock
            key={i}
            width={112}
            height={140}
            borderRadius={16}
            colors={colors}
          />
        ))}
      </View>
      <View style={{ marginTop: 28 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
          >
            <SkeletonBlock
              width={48}
              height={48}
              borderRadius={24}
              colors={colors}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <SkeletonBlock width="50%" height={15} colors={colors} />
              <SkeletonBlock
                width="30%"
                height={12}
                colors={colors}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [suggestedCollectors, setSuggestedCollectors] = useState<
    SuggestedCollector[]
  >([]);
  const [suggestedFragrances, setSuggestedFragrances] = useState<
    RecommendedFragrance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  // Pull-to-refresh bumps reloadKey, which re-runs the load effect below.
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const loadDiscoverData = async () => {
      try {
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) return;

        const usersSnap = await getDocs(
          query(collection(db, "users"), limit(PAGE_SIZE)),
        );
        const blocked = await loadBlockedIds();
        const userDocs = usersSnap.docs.filter(
          (d) => d.id !== currentUid && !blocked.has(d.id),
        );
        const userIds = userDocs.map((d) => d.id);

        const baseUsers: DiscoverUser[] = userDocs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            displayName: data.displayName || "Unnamed Collector",
            bio: data.bio || "",
            photoURL: data.photoURL || null,
            followerCount: data.followerCount || 0,
            createdAt: data.createdAt ?? null,
            topNotes: [],
            currentlyWearing: null,
            scentWords: new Set<string>(),
          };
        });

        const idChunks = chunkArray(userIds, FRAGRANCE_CHUNK_SIZE);

        const [fragranceSnaps, postSnaps, ownFragranceSnap, followSnap] =
          await Promise.all(
          [
            Promise.all(
              idChunks.map((chunk) =>
                getDocs(
                  query(
                    collection(db, "fragrances"),
                    where("userId", "in", chunk),
                  ),
                ),
              ),
            ),
            Promise.all(
              idChunks.map((chunk) =>
                getDocs(
                  query(collection(db, "posts"), where("userId", "in", chunk)),
                ),
              ),
            ),
            getDocs(
              query(
                collection(db, "fragrances"),
                where("userId", "==", currentUid),
              ),
            ),
            // Only used to hide already-followed people from suggestions, so
            // a failure here (e.g. security rules) shouldn't break Discover.
            getDocs(
              query(
                collection(db, "follows"),
                where("followerId", "==", currentUid),
              ),
            ).catch(() => null),
          ],
        );

        // Group each discover user's fragrance notes (and every scent word,
        // for matching against the current user's taste) together.
        const notesByUser = new Map<string, string[]>();
        const wordsByUser = new Map<string, Set<string>>();
        fragranceSnaps.forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.userId) return;
            const words = wordsByUser.get(data.userId) ?? new Set<string>();
            scentWords(data).forEach((w) => words.add(w));
            wordsByUser.set(data.userId, words);
            if (!data.notes) return;
            if (!notesByUser.has(data.userId)) {
              notesByUser.set(data.userId, []);
            }
            notesByUser.get(data.userId)!.push(data.notes);
          });
        });

        // Find each discover user's most recent post caption.
        const latestPostByUser = new Map<
          string,
          { caption: string; createdAt: Date }
        >();
        postSnaps.forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.userId || !data.caption || !data.createdAt?.toDate) {
              return;
            }
            const createdAtDate = data.createdAt.toDate();
            const existing = latestPostByUser.get(data.userId);
            if (!existing || createdAtDate > existing.createdAt) {
              latestPostByUser.set(data.userId, {
                caption: data.caption,
                createdAt: createdAtDate,
              });
            }
          });
        });

        const enrichedUsers: DiscoverUser[] = baseUsers.map((u) => ({
          ...u,
          topNotes: computeTopNotes(notesByUser.get(u.id) || [], 2),
          currentlyWearing: latestPostByUser.get(u.id)?.caption || null,
          scentWords: wordsByUser.get(u.id) ?? new Set<string>(),
        }));

        // Collectors for you: people not already followed, ranked by how much
        // of the user's taste their collection shares. Popular collectors fill
        // any gaps (e.g. when the user's own collection is still empty).
        const ownFragrances = ownFragranceSnap.docs.map((d) => d.data());
        const profile = buildTasteProfile(ownFragrances);
        const followed = new Set(
          (followSnap?.docs ?? []).map((d) => d.data().followingId as string),
        );
        const ranked = enrichedUsers
          .filter((u) => !followed.has(u.id))
          .map((u) => {
            const { score, reason } = scoreAgainst(profile, u.scentWords);
            return { ...u, score, reason: reason ? capitalize(reason) : null };
          })
          .sort((a, b) => b.score - a.score || b.followerCount - a.followerCount)
          .slice(0, SUGGESTION_COUNT);

        setUsers(enrichedUsers);
        setSuggestedCollectors(ranked);

        // Fragrance recommendations are a separate query; if it fails the rest
        // of Discover should still show.
        recommendFragrances(profile, ownFragrances, SUGGESTION_COUNT)
          .then(setSuggestedFragrances)
          .catch((error) =>
            console.error("Error loading fragrance suggestions:", error),
          );
      } catch (error) {
        console.error("Error loading discover list:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    loadDiscoverData();
  }, [reloadKey]);

  const newCollectors = useMemo(() => {
    return users
      .filter((u) => u.createdAt)
      .sort(
        (a, b) =>
          (b.createdAt!.toDate().getTime() || 0) -
          (a.createdAt!.toDate().getTime() || 0),
      )
      .slice(0, 8);
  }, [users]);

  // Client-side search over the collectors already loaded.
  const searching = searchText.trim().length > 0;
  const visibleUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.displayName.toLowerCase().includes(q));
  }, [users, searchText]);

  if (loading) {
    return <DiscoverSkeleton colors={colors} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={visibleUsers}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setReloadKey((k) => k + 1);
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <View
            style={[
              styles.searchBox,
              { borderColor: searchFocused ? colors.accent : colors.border },
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={searchFocused ? colors.accent : colors.tertiaryText}
            />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search collectors"
              placeholderTextColor={colors.tertiaryText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching ? (
              <Pressable onPress={() => setSearchText("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.tertiaryText}
                />
              </Pressable>
            ) : null}
          </View>

          {!searching && newCollectors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New to Scented Roots</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={newCollectors}
                keyExtractor={(item) => `new-${item.id}`}
                contentContainerStyle={styles.cardRow}
                renderItem={({ item }) => (
                  <CollectorCard
                    user={item}
                    subtitle={joinedTimeAgo(item.createdAt?.toDate() ?? null)}
                    colors={colors}
                    onPress={() => router.push(`/user/${item.id}`)}
                  />
                )}
              />
            </View>
          )}

          {!searching && suggestedFragrances.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fragrances for you</Text>
              <View style={styles.tileRow}>
                {suggestedFragrances.map((f) => (
                  <AnimatedPressable
                    key={f.id}
                    style={styles.tile}
                    scaleTo={0.96}
                    onPress={() =>
                      router.push({
                        pathname: "/add-from-catalog",
                        params: { id: f.id },
                      })
                    }
                  >
                    <FragranceImage uri={f.photoURL} style={styles.tileImage} />
                    <Text style={styles.tileName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={styles.tileReason} numberOfLines={1}>
                      {f.reason ? `You like ${f.reason}` : f.brand}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}

          {!searching && suggestedCollectors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Collectors for you</Text>
              <View style={styles.tileRow}>
                {suggestedCollectors.map((item) => (
                  <CollectorCard
                    key={`suggested-${item.id}`}
                    user={item}
                    subtitle={
                      item.reason
                        ? `Also loves ${item.reason}`
                        : item.topNotes.join(" · ")
                    }
                    colors={colors}
                    style={styles.tile}
                    onPress={() => router.push(`/user/${item.id}`)}
                  />
                ))}
              </View>
            </View>
          )}

          {visibleUsers.length > 0 && (
            <Text style={styles.allSectionTitle}>
              {searching
                ? `${visibleUsers.length} ${visibleUsers.length === 1 ? "collector" : "collectors"}`
                : "All Collectors"}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>
            {searching ? "No collectors found" : "No collectors yet"}
          </Text>
          <Text style={styles.emptyText}>
            {searching
              ? "Try a different name."
              : "Check back once more people have joined Scented Roots."}
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <FadeInItem index={index}>
          <AnimatedPressable
            style={styles.row}
            onPress={() => router.push(`/user/${item.id}`)}
            scaleTo={0.98}
          >
            <Avatar name={item.displayName} photoURL={item.photoURL} size={48} />
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>
                {item.displayName}
              </Text>
              <RowSubtitle item={item} colors={colors} />
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.tertiaryText}
            />
          </AnimatedPressable>
        </FadeInItem>
      )}
    />
  );
}

// Priority: what they're currently wearing > their top notes > their bio >
// follower count. Each tier is a richer, more "alive" signal than the last.
function RowSubtitle({
  item,
  colors,
}: {
  item: DiscoverUser;
  colors: ThemeColors;
}) {
  const styles = createStyles(colors);

  if (item.currentlyWearing) {
    return (
      <View style={styles.wearingRow}>
        <Ionicons name="sparkles-outline" size={12} color={colors.accent} />
        <Text style={styles.wearingText} numberOfLines={1}>
          {item.currentlyWearing}
        </Text>
      </View>
    );
  }

  if (item.topNotes.length > 0) {
    return (
      <Text style={styles.notesText} numberOfLines={1}>
        {item.topNotes.join(" · ")}
      </Text>
    );
  }

  if (item.bio) {
    return (
      <Text style={styles.bio} numberOfLines={1}>
        {item.bio}
      </Text>
    );
  }

  return (
    <Text style={styles.followerCount}>
      {item.followerCount === 1
        ? "1 follower"
        : `${item.followerCount} followers`}
    </Text>
  );
}

function CollectorCard({
  user,
  subtitle,
  colors,
  style,
  onPress,
}: {
  user: DiscoverUser;
  subtitle: string;
  colors: ThemeColors;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  const styles = createStyles(colors);
  return (
    <AnimatedPressable
      style={[styles.card, style]}
      onPress={onPress}
      scaleTo={0.96}
    >
      <View style={{ marginBottom: 8 }}>
        <Avatar name={user.displayName} photoURL={user.photoURL} size={56} />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>
        {user.displayName}
      </Text>
      {subtitle ? (
        <Text style={styles.cardSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: colors.inputBackground,
      marginBottom: 22,
    },
    searchInput: { flex: 1, fontSize: 16, padding: 0, color: colors.text },
    section: { marginBottom: 24 },
    sectionTitle: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 17,
      color: colors.text,
      marginBottom: 12,
    },
    allSectionTitle: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 17,
      color: colors.text,
      marginBottom: 4,
    },
    cardRow: { gap: 12, paddingRight: 8 },
    // Three equal columns, matching the Figma Discover tile row.
    tileRow: { flexDirection: "row", gap: 10 },
    tile: { flex: 1, width: undefined, minWidth: 0 },
    tileImage: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tileName: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginTop: 6,
    },
    tileReason: {
      fontSize: 11,
      color: colors.secondaryText,
      textAlign: "center",
      marginTop: 2,
    },
    card: {
      width: 112,
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.divider,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    cardName: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 13,
      color: colors.text,
      textAlign: "center",
    },
    cardSubtitle: {
      fontSize: 11,
      color: colors.secondaryText,
      textAlign: "center",
      marginTop: 4,
      lineHeight: 14,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    rowText: { flex: 1, marginLeft: 12 },
    name: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 16,
      color: colors.text,
    },
    bio: { fontSize: 13, color: colors.secondaryText, marginTop: 2 },
    notesText: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    wearingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
      gap: 4,
    },
    wearingText: {
      fontSize: 13,
      color: colors.secondaryText,
      fontStyle: "italic",
      flexShrink: 1,
    },
    followerCount: {
      fontSize: 13,
      color: colors.tertiaryText,
      marginTop: 2,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingTop: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accentBackground,
      alignItems: "center",
      justifyContent: "center",
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
  });
}
