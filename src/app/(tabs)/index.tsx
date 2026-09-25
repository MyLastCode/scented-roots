import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { FadeInItem } from "../../components/FadeInItem";
import { PhotoCarousel } from "../../components/PhotoCarousel";
import { ProfileStats } from "../../components/ProfileStats";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

type Fragrance = {
  id: string;
  name: string;
  brand: string;
  notes: string;
  photoURL?: string | null;
};

type Profile = {
  displayName: string;
  bio: string;
  photoURL: string | null;
  followerCount: number;
  followingCount: number;
};

type Post = {
  id: string;
  caption: string;
  description: string;
  photoURLs: string[];
};

const GRID_COLUMNS = 3;
const GRID_GAP = 10;
const HEADER_SPACING = 24;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE =
  (SCREEN_WIDTH - 40 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

function CollectionSkeleton({ colors }: { colors: ThemeColors }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.listContent}>
      <View style={styles.profileRow}>
        <SkeletonBlock
          width={96}
          height={96}
          borderRadius={48}
          colors={colors}
        />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <SkeletonBlock width="70%" height={22} colors={colors} />
          <SkeletonBlock
            width="40%"
            height={14}
            colors={colors}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>
      <SkeletonBlock
        width="100%"
        height={44}
        borderRadius={24}
        colors={colors}
        style={{ marginBottom: 24 }}
      />
      <View style={{ flexDirection: "row", gap: GRID_GAP }}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock
            key={i}
            width={GRID_ITEM_SIZE}
            height={GRID_ITEM_SIZE}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

export default function CollectionScreen() {
  const router = useRouter();
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    const [fragranceSnap, profileSnap, postsSnap] = await Promise.all([
      getDocs(
        query(collection(db, "fragrances"), where("userId", "==", user.uid)),
      ),
      getDoc(doc(db, "users", user.uid)),
      getDocs(
        query(
          collection(db, "posts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
        ),
      ),
    ]);

    const list = fragranceSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Fragrance[];
    setFragrances(list);

    setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      setProfile({
        displayName: data.displayName || "",
        bio: data.bio || "",
        photoURL: data.photoURL || null,
        followerCount: data.followerCount || 0,
        followingCount: data.followingCount || 0,
      });
    } else {
      setProfile({
        displayName: "",
        bio: "",
        photoURL: null,
        followerCount: 0,
        followingCount: 0,
      });
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const handleDeletePost = (postId: string) => {
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
              await deleteDoc(doc(db, "posts", postId));
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch (error) {
              console.error("Error deleting post:", error);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <CollectionSkeleton colors={colors} />;
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
        <View>
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
              {profile?.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {profile.bio}
                </Text>
              ) : (
                <Text style={styles.bioPlaceholder} numberOfLines={2}>
                  Add a short bio to introduce your collection.
                </Text>
              )}
            </View>
          </View>

          <ProfileStats
            fragranceCount={fragrances.length}
            followerCount={profile?.followerCount ?? 0}
            followingCount={profile?.followingCount ?? 0}
            colors={colors}
          />
          <View style={styles.statsSpacer} />

          <View style={styles.actionRow}>
            <AnimatedPressable
              style={styles.secondaryButton}
              onPress={() => router.push("/profile")}
            >
              <Text style={styles.secondaryButtonText}>Edit Profile</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.primaryButton}
              onPress={() => router.push("/add-fragrance")}
            >
              <Text style={styles.primaryButtonText}>+ Add Fragrance</Text>
            </AnimatedPressable>
          </View>

          <View style={styles.gridDivider} />
        </View>
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
        <FadeInItem index={index}>
          <AnimatedPressable
            style={styles.gridItem}
            onPress={() => router.push(`../detail/${item.id}`)}
            scaleTo={0.94}
          >
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.gridImage} />
            ) : (
              <View style={styles.gridImagePlaceholder}>
                <Ionicons
                  name="flask-outline"
                  size={22}
                  color={colors.tertiaryText}
                />
              </View>
            )}
            <Text style={styles.gridName} numberOfLines={1}>
              {item.name}
            </Text>
          </AnimatedPressable>
        </FadeInItem>
      )}
      ListFooterComponent={
        <View style={styles.postsSection}>
          <View style={styles.postsHeadingRow}>
            <Text style={styles.postsHeading}>My Posts</Text>
          </View>

          {posts.length === 0 ? (
            <Text style={styles.postsEmptyText}>
              Posts you share to the feed will show up here.
            </Text>
          ) : (
            posts.map((post, index) => (
              <FadeInItem key={post.id} index={index} style={styles.postCard}>
                <PhotoCarousel photos={post.photoURLs || []} colors={colors} />
                <Text style={styles.postCaption}>{post.caption}</Text>
                {post.description ? (
                  <Text style={styles.postDescription}>{post.description}</Text>
                ) : null}

                <View style={styles.postActionsRow}>
                  <AnimatedPressable
                    style={styles.postActionButton}
                    onPress={() =>
                      router.push({
                        pathname: "/new-post",
                        params: { postId: post.id },
                      })
                    }
                    scaleTo={0.95}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={15}
                      color={colors.text}
                    />
                    <Text style={styles.postActionText}>Edit</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={styles.postActionButton}
                    onPress={() => handleDeletePost(post.id)}
                    scaleTo={0.95}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.error}
                    />
                    <Text
                      style={[styles.postActionText, { color: colors.error }]}
                    >
                      Delete
                    </Text>
                  </AnimatedPressable>
                </View>
              </FadeInItem>
            ))
          )}
        </View>
      }
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: HEADER_SPACING,
    },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    profileStats: { marginLeft: 16, flex: 1 },
    displayName: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 30,
      color: colors.text,
    },
    statsSpacer: { height: 8 },
    bio: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      marginTop: 4,
    },
    bioPlaceholder: {
      fontSize: 13,
      color: colors.tertiaryText,
      fontStyle: "italic",
      lineHeight: 18,
      marginTop: 4,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: HEADER_SPACING,
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
    gridItem: { width: GRID_ITEM_SIZE },
    gridImage: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      borderRadius: 8,
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
    postsSection: { marginTop: 32 },
    postsHeadingRow: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 20,
      marginBottom: 16,
    },
    postsHeading: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 18,
      color: colors.text,
    },
    postsEmptyText: {
      fontSize: 14,
      color: colors.tertiaryText,
      fontStyle: "italic",
    },
    postCard: {
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    postCaption: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 15,
      color: colors.text,
      lineHeight: 21,
    },
    postDescription: {
      fontSize: 13,
      color: colors.secondaryText,
      lineHeight: 18,
      marginTop: 4,
    },
    postActionsRow: {
      flexDirection: "row",
      gap: 16,
      marginTop: 12,
    },
    postActionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    postActionText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "600",
    },
  });
}
