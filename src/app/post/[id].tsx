import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  writeBatch
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { FadeInItem } from "../../components/FadeInItem";
import { PhotoCarousel } from "../../components/PhotoCarousel";
import { fonts } from "../../constants/fonts";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

type Post = {
  userId: string;
  displayName: string;
  userPhotoURL: string | null;
  caption: string;
  description: string;
  photoURLs: string[];
};

type Comment = {
  id: string;
  userId: string;
  displayName: string;
  userPhotoURL: string | null;
  text: string;
  createdAt: { toDate: () => Date } | null;
};

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

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const loadPostAndComments = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [postSnap, commentsSnap] = await Promise.all([
        getDoc(doc(db, "posts", id)),
        getDocs(
          query(
            collection(db, "posts", id, "comments"),
            orderBy("createdAt", "asc"),
          ),
        ),
      ]);

      if (postSnap.exists()) {
        setPost(postSnap.data() as Post);
      }
      setComments(
        commentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[],
      );
    } catch (error) {
      console.error("Error loading post:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPostAndComments();
  }, [id]);

  const handleSend = async () => {
    const text = commentText.trim();
    if (!text || sending || !id) return;
    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      const profileData = profileSnap.exists() ? profileSnap.data() : {};

      const commentData = {
        userId: user.uid,
        displayName: profileData.displayName || "Unnamed Collector",
        userPhotoURL: profileData.photoURL || null,
        text,
        createdAt: new Date(),
      };

      const batch = writeBatch(db);
      const newCommentRef = doc(collection(db, "posts", id, "comments"));
      batch.set(newCommentRef, commentData);
      batch.set(
        doc(db, "posts", id),
        { commentCount: increment(1) },
        { merge: true },
      );
      await batch.commit();

      setComments((prev) => [
        ...prev,
        {
          id: newCommentRef.id,
          ...commentData,
          createdAt: { toDate: () => commentData.createdAt },
        },
      ]);
      setCommentText("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSending(false);
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        style={styles.container}
        contentContainerStyle={styles.listContent}
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          post ? (
            <View style={styles.postBlock}>
              <View style={styles.postHeader}>
                {post.userPhotoURL ? (
                  <Image
                    source={{ uri: post.userPhotoURL }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={colors.tertiaryText}
                    />
                  </View>
                )}
                <Text style={styles.displayName}>{post.displayName}</Text>
              </View>

              <PhotoCarousel photos={post.photoURLs || []} colors={colors} />

              <Text style={styles.caption}>{post.caption}</Text>
              {post.description ? (
                <Text style={styles.description}>{post.description}</Text>
              ) : null}

              <View style={styles.divider} />
              <Text style={styles.commentsHeading}>
                {comments.length === 0
                  ? "No comments yet"
                  : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <FadeInItem index={index} style={styles.commentRow}>
            {item.userPhotoURL ? (
              <Image
                source={{ uri: item.userPhotoURL }}
                style={styles.commentAvatar}
              />
            ) : (
              <View style={styles.commentAvatarPlaceholder}>
                <Ionicons
                  name="person-outline"
                  size={12}
                  color={colors.tertiaryText}
                />
              </View>
            )}
            <View style={styles.commentBody}>
              <Text style={styles.commentText}>
                <Text style={styles.commentAuthor}>{item.displayName} </Text>
                {item.text}
              </Text>
              <Text style={styles.commentTime}>
                {timeAgo(item.createdAt?.toDate?.() ?? null)}
              </Text>
            </View>
          </FadeInItem>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.tertiaryText}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !commentText.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name="arrow-up-circle"
              size={32}
              color={commentText.trim() ? colors.accent : colors.tertiaryText}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    postBlock: { marginBottom: 12 },
    postHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    displayName: {
      marginLeft: 10,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
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
      marginTop: 6,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: 16,
      marginBottom: 12,
    },
    commentsHeading: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.tertiaryText,
    },
    commentRow: {
      flexDirection: "row",
      marginBottom: 14,
    },
    commentAvatar: { width: 26, height: 26, borderRadius: 13 },
    commentAvatarPlaceholder: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    commentBody: { marginLeft: 10, flex: 1 },
    commentText: { fontSize: 14, color: colors.text, lineHeight: 19 },
    commentAuthor: { fontWeight: "600" },
    commentTime: { fontSize: 11, color: colors.tertiaryText, marginTop: 2 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      gap: 10,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      maxHeight: 100,
    },
  });
}
