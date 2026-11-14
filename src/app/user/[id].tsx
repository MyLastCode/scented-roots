import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { FadeInItem } from "../../components/FadeInItem";
import { ProfileStats } from "../../components/ProfileStats";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import Avatar from "../../components/ui/Avatar";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useContentMenu } from "../../hooks/useContentMenu";
import { useFollow } from "../../hooks/useFollow";
import { loadBlockedIds, unblockUser } from "../../lib/moderation";

type Fragrance = {
  id: string;
  name: string;
  photoURL?: string | null;
};

type Profile = {
  displayName: string;
  bio: string;
  photoURL: string | null;
  followerCount: number;
  followingCount: number;
};

const GRID_COLUMNS = 3;
const GRID_GAP = 10;
const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_ITEM_SIZE =
  (SCREEN_WIDTH - 40 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const isSelf = id === auth.currentUser?.uid;

  // After blocking from here, leave their profile.
  const menu = useContentMenu(() => router.back());

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const {
    isFollowing,
    loading: followLoading,
    busy,
    toggleFollow,
  } = useFollow(id ?? null);

  const [bounce] = useState(() => new Animated.Value(1));

  const handleTogglePress = () => {
    toggleFollow();
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: 1.12,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(bounce, {
        toValue: 1,
        speed: 20,
        bounciness: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      const [fragranceSnap, profileSnap, blocked] = await Promise.all([
        getDocs(query(collection(db, "fragrances"), where("userId", "==", id))),
        getDoc(doc(db, "users", id)),
        loadBlockedIds(),
      ]);
      setIsBlocked(blocked.has(id));

      setFragrances(
        fragranceSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Fragrance[],
      );

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setProfile({
          displayName: data.displayName || "Unnamed Collector",
          bio: data.bio || "",
          photoURL: data.photoURL || null,
          followerCount: data.followerCount || 0,
          followingCount: data.followingCount || 0,
        });
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Show the collector's name in the header once it's loaded.
  useEffect(() => {
    if (profile?.displayName) {
      navigation.setOptions({ title: profile.displayName });
    }
  }, [profile?.displayName]);

  const openMenu = () => {
    if (!id || !profile) return;
    menu.open({
      target: { type: "user", targetUserId: id },
      user: { id, displayName: profile.displayName, photoURL: profile.photoURL },
    });
  };

  const handleUnblock = async () => {
    if (!id) return;
    try {
      await unblockUser(id);
      setIsBlocked(false);
    } catch (error) {
      console.error("Error unblocking:", error);
    }
  };

  const openFollowList = (type: "followers" | "following") => {
    if (!id) return;
    router.push({ pathname: "/follows/[id]", params: { id, type } });
  };

  if (loading) {
    return (
      <View style={styles.listContent}>
        <View style={styles.profileRow}>
          <SkeletonBlock
            width={80}
            height={80}
            borderRadius={40}
            colors={colors}
          />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <SkeletonBlock width="60%" height={20} colors={colors} />
            <SkeletonBlock
              width="35%"
              height={13}
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
          style={{ marginBottom: 20 }}
        />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        // Hide a blocked collector's fragrances.
        data={isBlocked ? [] : fragrances}
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
              <Avatar
                name={profile?.displayName}
                photoURL={profile?.photoURL}
                size={80}
              />
              <View style={styles.profileStats}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {profile?.displayName}
                </Text>
              </View>
            </View>

            <ProfileStats
              fragranceCount={fragrances.length}
              followerCount={profile?.followerCount ?? 0}
              followingCount={profile?.followingCount ?? 0}
              colors={colors}
              onPressFollowers={() => openFollowList("followers")}
              onPressFollowing={() => openFollowList("following")}
            />
            <View style={styles.statsSpacer} />

            {profile?.bio && !isBlocked ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {isBlocked ? (
              <View style={styles.blockedBox}>
                <Text style={styles.blockedText}>
                  You blocked this collector. Their posts, comments and collection
                  are hidden from you.
                </Text>
                <AnimatedPressable
                  // flex: 0 so it sizes to its text here (followButton stretches in a row).
                  style={[styles.followButton, styles.followButtonActive, { flex: 0 }]}
                  onPress={handleUnblock}
                  scaleTo={0.95}
                >
                  <Text style={[styles.followButtonText, styles.followButtonTextActive]}>
                    Unblock
                  </Text>
                </AnimatedPressable>
              </View>
            ) : isSelf ? null : (
              <View style={styles.actionRow}>
                <AnimatedPressable
                  style={[
                    styles.followButton,
                    isFollowing && styles.followButtonActive,
                    { transform: [{ scale: bounce }] },
                  ]}
                  onPress={handleTogglePress}
                  disabled={followLoading || busy}
                  scaleTo={0.95}
                >
                  {busy ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? colors.text : colors.onAccent}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followButtonTextActive,
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  )}
                </AnimatedPressable>
                <Pressable
                  style={styles.moreButton}
                  onPress={openMenu}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
                </Pressable>
              </View>
            )}

            <View style={styles.gridDivider} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {isBlocked ? "" : "No fragrances in this collection yet."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeInItem index={index} style={styles.gridItem}>
            <Pressable
              onPress={() => router.push(`/detail/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
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
            </Pressable>
          </FadeInItem>
        )}
      />
      {menu.sheet}
    </>
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
    statsSpacer: { height: 16 },
    bio: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 20,
    },
    followButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 28,
      paddingVertical: 13,
      alignItems: "center",
    },
    moreButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    blockedBox: { gap: 12, marginBottom: 20 },
    blockedText: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
    },
    followButtonActive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    followButtonText: {
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: "600",
    },
    followButtonTextActive: { color: colors.text },
    gridDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: GRID_GAP + 4,
    },
    emptyState: { alignItems: "center", paddingTop: 24 },
    emptyText: { fontSize: 14, color: colors.tertiaryText },
    gridItem: { width: GRID_ITEM_SIZE },
    gridImage: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      borderRadius: 12,
    },
    gridImagePlaceholder: {
      width: GRID_ITEM_SIZE,
      height: GRID_ITEM_SIZE,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    gridName: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 6,
      textAlign: "center",
    },
  });
}
