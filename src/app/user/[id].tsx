import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { FadeInItem } from "../../components/FadeInItem";
import { ProfileStats } from "../../components/ProfileStats";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useFollow } from "../../hooks/useFollow";

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
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const {
    isFollowing,
    loading: followLoading,
    busy,
    toggleFollow,
  } = useFollow(id ?? null);

  const bounce = useRef(new Animated.Value(1)).current;

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
      const [fragranceSnap, profileSnap] = await Promise.all([
        getDocs(query(collection(db, "fragrances"), where("userId", "==", id))),
        getDoc(doc(db, "users", id)),
      ]);

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
                {profile?.displayName}
              </Text>
            </View>
          </View>

          <ProfileStats
            fragranceCount={fragrances.length}
            followerCount={profile?.followerCount ?? 0}
            followingCount={profile?.followingCount ?? 0}
            colors={colors}
          />
          <View style={styles.statsSpacer} />

          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

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
                color={isFollowing ? colors.text : colors.background}
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

          <View style={styles.gridDivider} />
        </View>
      }
      renderItem={({ item, index }) => (
        <FadeInItem index={index} style={styles.gridItem}>
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
        </FadeInItem>
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
    listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
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
    statsSpacer: { height: 16 },
    bio: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    followButton: {
      backgroundColor: colors.accent,
      borderRadius: 24,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 20,
    },
    followButtonActive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    followButtonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "600",
    },
    followButtonTextActive: { color: colors.text },
    gridDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: GRID_GAP,
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
  });
}
