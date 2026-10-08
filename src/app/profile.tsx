import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { fetchCollection, getCachedCollection } from "../services/collectionCache";

export default function ProfileScreen() {
  const router = useRouter();
  // Pre-fill the form from the Collection cache so it opens instantly.
  const initial = getCachedCollection()?.profile;
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [photoURL, setPhotoURL] = useState<string | null>(
    initial?.photoURL ?? null,
  );
  // Only show the spinner when there is nothing cached to pre-fill with.
  const [loading, setLoading] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const CLOUDINARY_CLOUD_NAME =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
  const CLOUDINARY_UPLOAD_PRESET =
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const user = auth.currentUser;

  useEffect(() => {
    // Cached data is already in the form; skip the fetch so we don't
    // overwrite anything the user has started typing.
    if (initial) return;

    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDisplayName(data.displayName || "");
        setBio(data.bio || "");
        setPhotoURL(data.photoURL || null);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access photos is needed to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      const imageResponse = await fetch(result.assets[0].uri);
      const blob = await imageResponse.blob();

      const formData = new FormData();
      formData.append("file", blob, "profile.jpg");
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );
      const data = await uploadResponse.json();
      setPhotoURL(data.secure_url);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { displayName, bio, photoURL, email: user.email },
        { merge: true },
      );
      // Refresh the cache so the Collection tab shows the new profile
      // immediately when we go back.
      await fetchCollection().catch(() => {});
      router.back();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  // Puts Save in the header instead of at the bottom of the form, so it's
  // always reachable even when the keyboard is open. Re-registers whenever
  // the editable fields or saving state change, since handleSave closes
  // over them and a stale closure would save old values.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ paddingRight: 4 }}
        >
          <Text
            style={{
              color: colors.accent,
              fontWeight: "600",
              fontSize: 16,
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, displayName, bio, photoURL, saving, colors]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrapper}>
        {uploading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.readOnly}>{user?.email}</Text>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="e.g. Tyler"
        placeholderTextColor={colors.tertiaryText}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={bio}
        onChangeText={setBio}
        placeholder="A short line about your collection or taste"
        placeholderTextColor={colors.tertiaryText}
        multiline
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 60,
      backgroundColor: colors.background,
    },
    avatarWrapper: { alignSelf: "center", marginBottom: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.placeholder,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarPlaceholderText: { color: colors.placeholderText, fontSize: 12 },
    label: {
      fontSize: 16,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 6,
      color: colors.text,
    },
    readOnly: { fontSize: 16, color: colors.secondaryText },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
    },
    multiline: { height: 80, textAlignVertical: "top" },
  });
}