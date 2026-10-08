import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { FadeInItem } from "../../components/FadeInItem";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

type DiscoverUser = {
  id: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
  followerCount: number;
  createdAt: { toDate: () => Date } | null;
  topNotes: string[];
  currentlyWearing: string | null;
};

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
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      <SkeletonBlock width="55%" height={18} colors={colors} />
      <View style={{ flexDirection: "row", marginTop: 14, gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock
            key={i}
            width={110}
            height={140}
            borderRadius={14}
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
  const [topAccord, setTopAccord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const userDocs = usersSnap.docs.filter((d) => d.id !== currentUid);
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
          };
        });

        const idChunks = chunkArray(userIds, FRAGRANCE_CHUNK_SIZE);

        const [fragranceSnaps, postSnaps, ownFragranceSnap] = await Promise.all(
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
          ],
        );

        // Group each discover user's fragrance notes together.
        const notesByUser = new Map<string, string[]>();
        fragranceSnaps.forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.userId || !data.notes) return;
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

        const ownNotes = ownFragranceSnap.docs
          .map((d) => d.data().notes)
          .filter(Boolean) as string[];
        const ownTopAccord = computeTopNotes(ownNotes, 1)[0] || null;

        const enrichedUsers: DiscoverUser[] = baseUsers.map((u) => ({
          ...u,
          topNotes: computeTopNotes(notesByUser.get(u.id) || [], 2),
          currentlyWearing: latestPostByUser.get(u.id)?.caption || null,
        }));

        setUsers(enrichedUsers);
        setTopAccord(ownTopAccord);
      } catch (error) {
        console.error("Error loading discover list:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDiscoverData();
  }, []);

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

  const sharedAccordCollectors = useMemo(() => {
    if (!topAccord) return [];
    const key = topAccord.toLowerCase();
    return users
      .filter((u) => u.topNotes.some((n) => n.toLowerCase() === key))
      .slice(0, 8);
  }, [users, topAccord]);

  if (loading) {
    return <DiscoverSkeleton colors={colors} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={users}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          {newCollectors.length > 0 && (
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

          {sharedAccordCollectors.length > 0 && topAccord && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Collectors who love {topAccord}
              </Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={sharedAccordCollectors}
                keyExtractor={(item) => `accord-${item.id}`}
                contentContainerStyle={styles.cardRow}
                renderItem={({ item }) => (
                  <CollectorCard
                    user={item}
                    subtitle={item.topNotes.join(" · ")}
                    colors={colors}
                    onPress={() => router.push(`/user/${item.id}`)}
                  />
                )}
              />
            </View>
          )}

          {users.length > 0 && (
            <Text style={styles.allSectionTitle}>All Collectors</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons
            name="people-outline"
            size={40}
            color={colors.tertiaryText}
          />
          <Text style={styles.emptyTitle}>No collectors yet</Text>
          <Text style={styles.emptyText}>
            Check back once more people have joined Scented Roots.
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
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={colors.tertiaryText}
                />
              </View>
            )}
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
  onPress,
}: {
  user: DiscoverUser;
  subtitle: string;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const styles = createStyles(colors);
  return (
    <AnimatedPressable style={styles.card} onPress={onPress} scaleTo={0.96}>
      {user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={styles.cardAvatar} />
      ) : (
        <View style={styles.cardAvatarPlaceholder}>
          <Ionicons
            name="person-outline"
            size={26}
            color={colors.tertiaryText}
          />
        </View>
      )}
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
    listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
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
    card: {
      width: 112,
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    cardAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
    cardAvatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
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
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
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
