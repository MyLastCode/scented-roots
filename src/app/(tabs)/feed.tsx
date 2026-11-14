import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth } from "../../../firebaseConfig";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { FadeInItem } from "../../components/FadeInItem";
import { PhotoCarousel } from "../../components/PhotoCarousel";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import Avatar from "../../components/ui/Avatar";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useContentMenu } from "../../hooks/useContentMenu";
import { loadBlockedIds } from "../../lib/moderation";
import { openProfile } from "../../lib/navigation";
import { fetchFeed, getCachedPosts, Post } from "../../services/feedCache";

function timeAgo(date: Date | null) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FeedSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      {[0, 1].map((i) => (
        <View key={i} style={{ marginBottom: 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <SkeletonBlock
              width={36}
              height={36}
              borderRadius={18}
              colors={colors}
            />
            <View style={{ marginLeft: 10 }}>
              <SkeletonBlock width={100} height={13} colors={colors} />
              <SkeletonBlock
                width={56}
                height={10}
                colors={colors}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
          <SkeletonBlock
            width="100%"
            height={300}
            borderRadius={14}
            colors={colors}
          />
          <SkeletonBlock
            width="60%"
            height={16}
            colors={colors}
            style={{ marginTop: 14 }}
          />
        </View>
      ))}
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(getCachedPosts() ?? []);
  // Only show the skeleton when there is nothing cached to display yet.
  const [loading, setLoading] = useState(!getCachedPosts());
  const [refreshing, setRefreshing] = useState(false);
  const myUid = auth.currentUser?.uid;

  const menu = useContentMenu((blockedId) =>
    setPosts((prev) => prev.filter((p) => p.userId !== blockedId)),
  );

  const { colors } = useTheme();
  const cardStyles = styles(colors);

  const loadPosts = useCallback(async () => {
    try {
      const [feed, blocked] = await Promise.all([fetchFeed(), loadBlockedIds()]);
      setPosts(feed.filter((p) => !blocked.has(p.userId)));
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts]),
  );

  // Pull-to-refresh: drag the list down to re-fetch.
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  if (loading) {
    return <FeedSkeleton colors={colors} />;
  }

  return (
    <>
      <FlatList
        style={cardStyles.container}
        contentContainerStyle={cardStyles.listContent}
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={cardStyles.emptyState}>
            <View style={cardStyles.emptyIcon}>
              <Ionicons name="newspaper-outline" size={36} color={colors.accent} />
            </View>
            <Text style={cardStyles.emptyTitle}>No posts yet</Text>
            <Text style={cardStyles.emptyText}>
              Be the first to post about a fragrance using the + button at the top.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeInItem index={index} style={cardStyles.card}>
            <View style={cardStyles.postHeaderRow}>
              <AnimatedPressable
                style={cardStyles.postHeader}
                onPress={() => openProfile(item.userId)}
                scaleTo={0.98}
              >
                <Avatar name={item.displayName} photoURL={item.userPhotoURL} size={36} />
                <View style={cardStyles.postHeaderText}>
                  <Text style={cardStyles.displayName}>{item.displayName}</Text>
                  <Text style={cardStyles.timeAgo}>
                    {timeAgo(item.createdAt?.toDate?.() ?? null)}
                  </Text>
                </View>
              </AnimatedPressable>
              {item.userId !== myUid ? (
                <Pressable
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="More options"
                  onPress={() =>
                    menu.open({
                      target: {
                        type: "post",
                        postId: item.id,
                        targetUserId: item.userId,
                      },
                      user: {
                        id: item.userId,
                        displayName: item.displayName,
                        photoURL: item.userPhotoURL,
                      },
                    })
                  }
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={colors.secondaryText}
                  />
                </Pressable>
              ) : null}
            </View>

            <PhotoCarousel photos={item.photoURLs || []} colors={colors} />

            <AnimatedPressable
              style={cardStyles.actionsRow}
              onPress={() => router.push(`/post/${item.id}`)}
              scaleTo={0.97}
            >
              <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
              <Text style={cardStyles.actionText}>
                {item.commentCount ? String(item.commentCount) : "Add a comment"}
              </Text>
            </AnimatedPressable>

            <Text style={cardStyles.caption}>{item.caption}</Text>
            {item.description ? (
              <Text style={cardStyles.description}>{item.description}</Text>
            ) : null}
          </FadeInItem>
        )}
      />
      {menu.sheet}
    </>
  );
}

function styles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    card: {
      marginBottom: 28,
    },
    postHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    postHeader: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    postHeaderText: { marginLeft: 10 },
    displayName: { fontSize: 14, fontWeight: "600", color: colors.text },
    timeAgo: { fontSize: 12, color: colors.tertiaryText, marginTop: 1 },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
      marginBottom: 8,
    },
    actionText: { fontSize: 14, fontWeight: "500", color: colors.text },
    caption: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    description: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
      marginTop: 4,
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
