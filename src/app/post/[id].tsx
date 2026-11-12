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
  writeBatch,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { FadeInItem } from "../../components/FadeInItem";
import { PhotoCarousel } from "../../components/PhotoCarousel";
import Avatar from "../../components/ui/Avatar";
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
  createdAt?: { toDate: () => Date } | null;
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
      Alert.alert("Couldn't post comment", "Please try again.");
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

  const canSend = commentText.trim().length > 0 && !sending;

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
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          post ? (
            <View style={styles.postBlock}>
              <View style={styles.postHeader}>
                <Avatar
                  name={post.displayName}
                  photoURL={post.userPhotoURL}
                  size={36}
                />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.displayName}>{post.displayName}</Text>
                  {post.createdAt?.toDate ? (
                    <Text style={styles.postTime}>
                      {timeAgo(post.createdAt.toDate())}
                    </Text>
                  ) : null}
                </View>
              </View>

              <PhotoCarousel photos={post.photoURLs || []} colors={colors} />

              <Text style={styles.caption}>{post.caption}</Text>
              {post.description ? (
                <Text style={styles.description}>{post.description}</Text>
              ) : null}

              <View style={styles.divider} />
              <Text style={styles.commentsHeading}>
                {comments.length === 0
                  ? "Comments"
                  : `Comments · ${comments.length}`}
              </Text>
              {comments.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    color={colors.tertiaryText}
                  />
                  <Text style={styles.emptyCommentsText}>
                    No comments yet. Start the conversation.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <FadeInItem index={index} style={styles.commentRow}>
            <Avatar
              name={item.displayName}
              photoURL={item.userPhotoURL}
              size={32}
            />
            <View style={styles.commentBody}>
              <View style={styles.commentHead}>
                <Text style={styles.commentAuthor}>{item.displayName}</Text>
                <Text style={styles.commentTime}>
                  {timeAgo(item.createdAt?.toDate?.() ?? null)}
                </Text>
              </View>
              <Text style={styles.commentText}>{item.text}</Text>
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
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? colors.accent : colors.placeholder },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Ionicons
              name="send"
              size={17}
              color={canSend ? colors.onAccent : colors.placeholderText}
            />
          )}
        </Pressable>
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
    listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
    postBlock: { marginBottom: 12 },
    postHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    displayName: { fontSize: 14, fontWeight: "600", color: colors.text },
    postTime: { fontSize: 12, color: colors.tertiaryText, marginTop: 1 },
    caption: {
      fontFamily: fonts.serifSemiBold,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
      marginTop: 14,
    },
    description: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
      marginTop: 4,
    },
    divider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: 18,
      marginBottom: 14,
    },
    commentsHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    emptyComments: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
    },
    emptyCommentsText: { fontSize: 14, color: colors.tertiaryText },
    commentRow: {
      flexDirection: "row",
      marginBottom: 16,
    },
    commentBody: { marginLeft: 10, flex: 1, gap: 2 },
    commentHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    commentAuthor: { fontSize: 13, fontWeight: "600", color: colors.text },
    commentTime: { fontSize: 12, color: colors.tertiaryText },
    commentText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === "ios" ? 24 : 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      backgroundColor: colors.card,
      gap: 10,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      maxHeight: 100,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
