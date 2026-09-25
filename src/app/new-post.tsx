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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const CLOUDINARY_CLOUD_NAME = "qkpbnofd";
const CLOUDINARY_UPLOAD_PRESET = "fragrance_app_unsigned";

// Instagram-style cap so a post stays quick to scroll through.
const MAX_PHOTOS = 8;

async function uploadImageAsync(uri: string): Promise<string> {
  const imageResponse = await fetch(uri);
  const blob = await imageResponse.blob();
  const formData = new FormData();
  formData.append("file", blob, "post.jpg");
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  const data = await uploadResponse.json();
  return data.secure_url;
}

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
      alert("Permission to access photos is needed.");
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
        result.assets.map((asset) => uploadImageAsync(asset.uri)),
      );
      setPhotos((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    } catch (error) {
      console.error("Error uploading images:", error);
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
      <ScrollView style={styles.container}>
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                <Ionicons name="add" size={28} color={colors.tertiaryText} />
              )}
            </TouchableOpacity>
          )}
        </ScrollView>

        <Text style={styles.label}>Caption</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={caption}
          onChangeText={setCaption}
          placeholder="What are you wearing today?"
          placeholderTextColor={colors.tertiaryText}
          multiline
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add more detail if you'd like — notes, occasion, longevity..."
          placeholderTextColor={colors.tertiaryText}
          multiline
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
              <ActivityIndicator color={colors.background} />
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
            <Ionicons name="checkmark" size={36} color={colors.background} />
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
    label: {
      fontSize: 16,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
      color: colors.text,
    },
    thumbWrapper: { marginRight: 10 },
    thumb: { width: 90, height: 90, borderRadius: 10 },
    removeBadge: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: "rgba(0,0,0,0.6)",
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    addThumb: {
      width: 90,
      height: 90,
      borderRadius: 10,
      backgroundColor: colors.placeholder,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    multiline: { height: 70, textAlignVertical: "top" },
    buttonWrapper: { marginTop: 24, marginBottom: 40 },
    postButton: {
      backgroundColor: colors.accent,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: "center",
    },
    postButtonDisabled: { opacity: 0.5 },
    postButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
    deleteButtonWrapper: { marginTop: 16, marginBottom: 40 },
    deleteButton: {
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 24,
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
