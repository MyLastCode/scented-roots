import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { AnimatedPressable } from "../components/AnimatedPressable";
import TextField from "../components/ui/TextField";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { uploadImage } from "../lib/cloudinary";

// Instagram-style cap so a post stays quick to scroll through.
const MAX_PHOTOS = 8;

export default function NewPostScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const isEditing = Boolean(postId);

  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingPost, setLoadingPost] = useState(isEditing);
  const [showSuccess, setShowSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? "Edit Post" : "New Post" });
  }, [isEditing]);

  useEffect(() => {
    if (!postId) return;
    const loadPost = async () => {
      const snap = await getDoc(doc(db, "posts", postId));
      if (snap.exists()) {
        const data = snap.data();
        setCaption(data.caption || "");
        setDescription(data.description || "");
        setPhotos(data.photoURLs || []);
      }
      setLoadingPost(false);
    };
    loadPost();
  }, [postId]);

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to add pictures.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        result.assets.map((asset) => uploadImage(asset.uri, "post.jpg")),
      );
      setPhotos((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    } catch (error: any) {
      console.error("Error uploading images:", error);
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

  const playSuccessAndGoBack = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        speed: 16,
        bounciness: 10,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => router.back(), 650);
  };

  const handlePost = async () => {
    if (!caption.trim() || posting) return;
    const user = auth.currentUser;
    if (!user) return;

    setPosting(true);
    try {
      if (isEditing && postId) {
        await updateDoc(doc(db, "posts", postId), {
          caption,
          description,
          photoURLs: photos,
        });
      } else {
        // Snapshot the poster's current name/photo onto the post itself so
        // the feed can render without an extra lookup per post.
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        const profileData = profileSnap.exists() ? profileSnap.data() : {};

        await addDoc(collection(db, "posts"), {
          userId: user.uid,
          displayName: profileData.displayName || "Unnamed Collector",
          userPhotoURL: profileData.photoURL || null,
          caption,
          description,
          photoURLs: photos,
          commentCount: 0,
          createdAt: new Date(),
        });
      }

      playSuccessAndGoBack();
    } catch (error) {
      console.error("Error saving post:", error);
      Alert.alert("Couldn't save post", "Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = () => {
    if (!postId) return;
    Alert.alert(
      "Delete Post",
      "This can't be undone. Comments on this post will also be removed from view.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(db, "posts", postId));
              router.back();
            } catch (error) {
              console.error("Error deleting post:", error);
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loadingPost) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
      >
        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Photos</Text>
            <Text style={styles.counter}>
              {photos.length} of {MAX_PHOTOS}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10, overflow: "visible" }}
          >
            {photos.map((url) => (
              <View key={url} style={styles.thumbWrapper}>
                <Image source={{ uri: url }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => removePhoto(url)}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={handlePickImages}
                style={styles.addThumb}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons
                    name="add"
                    size={28}
                    color={colors.placeholderText}
                  />
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <TextField
          label="Caption *"
          value={caption}
          onChangeText={setCaption}
          placeholder="What are you wearing today?"
          multiline
          style={{ minHeight: 70 }}
        />

        <TextField
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add more detail if you'd like: notes, occasion, longevity..."
          multiline
          style={{ minHeight: 100 }}
        />

        <View style={styles.buttonWrapper}>
          <AnimatedPressable
            style={[
              styles.postButton,
              (posting || !caption.trim()) && styles.postButtonDisabled,
            ]}
            onPress={handlePost}
            disabled={posting || deleting || !caption.trim()}
          >
            {posting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.postButtonText}>
                {isEditing ? "Save Changes" : "Post"}
              </Text>
            )}
          </AnimatedPressable>
        </View>

        {isEditing && (
          <View style={styles.deleteButtonWrapper}>
            <AnimatedPressable
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={posting || deleting}
            >
              <Text style={styles.deleteButtonText}>
                {deleting ? "Deleting..." : "Delete Post"}
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>

      {showSuccess && (
        <Animated.View
          pointerEvents="none"
          style={[styles.successOverlay, { opacity: successOpacity }]}
        >
          <Animated.View
            style={[
              styles.successBadge,
              { transform: [{ scale: successScale }] },
            ]}
          >
            <Ionicons name="checkmark" size={36} color={colors.onAccent} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: { fontSize: 15, fontWeight: "600", color: colors.text },
    counter: { fontSize: 13, color: colors.tertiaryText },
    thumbWrapper: { marginRight: 10, paddingTop: 6 },
    thumb: { width: 96, height: 96, borderRadius: 12 },
    removeBadge: {
      position: "absolute",
      top: 0,
      right: -6,
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    addThumb: {
      width: 96,
      height: 96,
      marginTop: 6,
      borderRadius: 12,
      backgroundColor: colors.placeholder,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonWrapper: { marginTop: 8 },
    postButton: {
      backgroundColor: colors.accent,
      borderRadius: 28,
      paddingVertical: 15,
      alignItems: "center",
    },
    postButtonDisabled: { opacity: 0.5 },
    postButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "600",
    },
    deleteButtonWrapper: { marginBottom: 40 },
    deleteButton: {
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 28,
      paddingVertical: 14,
      alignItems: "center",
    },
    deleteButtonText: {
      color: colors.error,
      fontSize: 16,
      fontWeight: "600",
    },
    successOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    successBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
