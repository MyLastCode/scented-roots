import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { BlockedUser, listBlockedUsers, unblockUser } from "../lib/moderation";

// Settings > Blocked Collectors: the only place to find people you've
// blocked, since they're hidden everywhere else.
export default function BlockedScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listBlockedUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((error) => console.error("Error loading blocked users:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnblock = async (userId: string) => {
    setBusyId(userId);
    try {
      await unblockUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Error unblocking:", error);
    } finally {
      setBusyId(null);
    }
  };

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
      data={users}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.emptyText}>You haven&apos;t blocked anyone.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar name={item.displayName} photoURL={item.photoURL} size={40} />
          <Text style={styles.name} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Button
            title="Unblock"
            variant="outline"
            size="sm"
            onPress={() => handleUnblock(item.id)}
            loading={busyId === item.id}
            disabled={busyId !== null}
          />
        </View>
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
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    name: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
    emptyText: {
      fontSize: 14,
      color: colors.tertiaryText,
      textAlign: "center",
      marginTop: 32,
    },
  });
}
