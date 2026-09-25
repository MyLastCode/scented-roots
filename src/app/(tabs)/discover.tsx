import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { useEffect, useState } from "react";
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
};

const PAGE_SIZE = 50;

function DiscoverSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
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
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const currentUid = auth.currentUser?.uid;
        const snapshot = await getDocs(
          query(collection(db, "users"), limit(PAGE_SIZE)),
        );
        const list = snapshot.docs
          .filter((d) => d.id !== currentUid)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              displayName: data.displayName || "Unnamed Collector",
              bio: data.bio || "",
              photoURL: data.photoURL || null,
              followerCount: data.followerCount || 0,
            };
          });
        setUsers(list);
      } catch (error) {
        console.error("Error loading discover list:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) {
    return <DiscoverSkeleton colors={colors} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={users}
      keyExtractor={(item) => item.id}
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
              {item.bio ? (
                <Text style={styles.bio} numberOfLines={1}>
                  {item.bio}
                </Text>
              ) : (
                <Text style={styles.followerCount}>
                  {item.followerCount === 1
                    ? "1 follower"
                    : `${item.followerCount} followers`}
                </Text>
              )}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
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
