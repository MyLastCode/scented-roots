import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Chip from "../../components/ui/Chip";
import {
  SCENT_FAMILIES,
  ScentFamily,
  scentFamiliesOf,
} from "../../lib/scentFamily";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { auth, db } from "../../../firebaseConfig";
import FragranceImage from "../../components/FragranceImage";
import MyPostRow from "../../components/MyPostRow";
import { PressableScale } from "../../components/PressableScale";
import { ProfileStats } from "../../components/ProfileStats";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchCollection,
  Fragrance,
  getCachedCollection,
  Profile,
} from "../../services/collectionCache";

const GRID_COLUMNS = 3;
const GRID_GAP = 10;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - 40 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);

type MyPost = {
  id: string;
  caption: string;
  photoURLs: string[];
  commentCount: number;
};

function CollectionSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <SkeletonBlock width={80} height={80} borderRadius={40} colors={colors} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <SkeletonBlock width="55%" height={22} colors={colors} />
          <SkeletonBlock
            width="80%"
            height={30}
            colors={colors}
            style={{ marginTop: 10 }}
          />
        </View>
      </View>
      <SkeletonBlock width="100%" height={12} colors={colors} style={{ marginTop: 20 }} />
      <SkeletonBlock width="65%" height={12} colors={colors} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
        <SkeletonBlock width={(SCREEN_WIDTH - 50) / 2} height={46} borderRadius={24} colors={colors} />
        <SkeletonBlock width={(SCREEN_WIDTH - 50) / 2} height={46} borderRadius={24} colors={colors} />
      </View>
      <View style={{ marginTop: 24, gap: GRID_GAP }}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={{ flexDirection: "row", gap: GRID_GAP }}>
            {[0, 1, 2].map((col) => (
              <SkeletonBlock
                key={col}
                width={GRID_ITEM_SIZE}
                height={GRID_ITEM_SIZE}
                borderRadius={12}
                colors={colors}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

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
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [filter, setFilter] = useState<ScentFamily | "all">("all");
  // Only show the skeleton when there is nothing cached yet.
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

  const loadMyPosts = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDocs(
        query(collection(db, "posts"), where("userId", "==", uid)),
      );
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
        ) as MyPost[];
      setMyPosts(list);
    } catch (error) {
      console.error("Error loading my posts:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadMyPosts();
    }, [loadData, loadMyPosts]),
  );

  const handleDeletePost = (post: MyPost) => {
    Alert.alert(
      "Delete Post",
      "This can't be undone. Comments on this post will also be removed from view.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "posts", post.id));
              setMyPosts((prev) => prev.filter((p) => p.id !== post.id));
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Couldn't delete post", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const countLabel =
    fragrances.length === 1 ? "1 fragrance" : `${fragrances.length} fragrances`;

  // Follower/following counts only show once collectionCache's Profile
  // includes them (see notes). Until then we keep the plain fragrance count.
  const social = profile as
    | (Profile & { followerCount?: number; followingCount?: number })
    | null;
  const hasSocialCounts =
    social?.followerCount !== undefined && social?.followingCount !== undefined;

  const visibleFragrances =
    filter === "all"
      ? fragrances
      : fragrances.filter((f) => scentFamiliesOf(f).has(filter));

  if (loading) {
    return <CollectionSkeleton colors={colors} />;
  }

  return (
    <FlatList
      style={styles.container}
      data={visibleFragrances}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={
        visibleFragrances.length > 0
          ? { gap: GRID_GAP, marginBottom: GRID_GAP }
          : undefined
      }
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.profileRow}>
            <Avatar
              name={profile?.displayName}
              photoURL={profile?.photoURL}
              size={80}
            />
            <View style={styles.profileStats}>
              <Text style={styles.displayName} numberOfLines={1}>
                {profile?.displayName || "Add your name"}
              </Text>
              {hasSocialCounts ? null : (
                <Text style={styles.statCount}>{countLabel}</Text>
              )}
            </View>
          </View>

          {hasSocialCounts ? (
            <View style={{ marginBottom: 16 }}>
              <ProfileStats
                fragranceCount={fragrances.length}
                followerCount={social!.followerCount!}
                followingCount={social!.followingCount!}
                colors={colors}
              />
            </View>
          ) : null}

          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>
              Add a short bio to introduce your collection.
            </Text>
          )}

          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Edit Profile"
                variant="outline"
                onPress={() => router.push("/profile")}
                style={{ paddingVertical: 12 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="+ Add Fragrance"
                onPress={() => router.push("/add-fragrance")}
                style={{ paddingVertical: 12 }}
              />
            </View>
          </View>

          {fragrances.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
            >
              <Chip
                label="All"
                selected={filter === "all"}
                onPress={() => setFilter("all")}
              />
              {SCENT_FAMILIES.map((f) => (
                <Chip
                  key={f.key}
                  label={f.label}
                  dotColor={f.dotColor}
                  selected={filter === f.key}
                  onPress={() => setFilter(f.key)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.gridDivider} />
          )}
        </Animated.View>
      }
      ListEmptyComponent={
        fragrances.length > 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No{" "}
              {SCENT_FAMILIES.find((f) => f.key === filter)?.label.toLowerCase()}{" "}
              fragrances in your collection yet.
            </Text>
          </View>
        ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="flask-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Your collection is empty</Text>
          <Text style={styles.emptyText}>
            Add your first fragrance to start building your collection.
          </Text>
        </View>
        )
      }
      renderItem={({ item, index }) => (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 12) * 50).duration(350)}
          style={styles.gridItem}
        >
          <PressableScale onPress={() => router.push(`../detail/${item.id}`)}>
            <FragranceImage uri={item.photoURL} style={styles.gridImage} />
            <Text style={styles.gridName} numberOfLines={1}>
              {item.name}
            </Text>
          </PressableScale>
        </Animated.View>
      )}
      ListFooterComponent={
        myPosts.length > 0 ? (
          <View style={styles.postsSection}>
            <View style={styles.postsHeader}>
              <Text style={styles.postsTitle}>My Posts</Text>
              <Text style={styles.postsCount}>
                {myPosts.length} {myPosts.length === 1 ? "post" : "posts"}
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {myPosts.map((post) => (
                <MyPostRow
                  key={post.id}
                  caption={post.caption}
                  photoURL={post.photoURLs?.[0] ?? null}
                  photoCount={post.photoURLs?.length ?? 0}
                  commentCount={post.commentCount ?? 0}
                  onPress={() => router.push(`/post/${post.id}`)}
                  onEdit={() =>
                    router.push({
                      pathname: "/new-post",
                      params: { postId: post.id },
                    })
                  }
                  onDelete={() => handleDeletePost(post)}
                />
              ))}
            </View>
          </View>
        ) : undefined
      }
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
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
    filterScroll: { marginHorizontal: -20, marginBottom: 14 },
    filterRow: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
    gridDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: GRID_GAP + 4,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingTop: 40,
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
    gridItem: { width: GRID_ITEM_SIZE },
    gridImage: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    gridName: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: "center",
    },
    postsSection: { marginTop: 28 },
    postsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    postsTitle: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 20,
      color: colors.text,
    },
    postsCount: { fontSize: 13, color: colors.tertiaryText },
  });
}
