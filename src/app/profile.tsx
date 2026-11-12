import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { useTheme } from "../context/ThemeContext";
import { uploadImage } from "../lib/cloudinary";

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
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
      Alert.alert(
        "Permission needed",
        "Allow photo access to set a profile picture.",
      );
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
      setPhotoURL(await uploadImage(result.assets[0].uri, "profile.jpg"));
    } catch (error: any) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // merge: true keeps fields written elsewhere (termsAcceptedAt, follower
      // counts, etc.) instead of wiping them on every save.
      await setDoc(
        doc(db, "users", user.uid),
        { displayName: displayName.trim(), bio: bio.trim(), photoURL, email: user.email },
        { merge: true },
      );
      router.back();
    } catch (error: any) {
      Alert.alert("Couldn't save profile", error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarWrap}>
        <Pressable onPress={handlePickImage}>
          {uploading ? (
            <View
              style={[
                styles.uploading,
                { backgroundColor: colors.placeholder },
              ]}
            >
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <Avatar name={displayName || user?.email} photoURL={photoURL} size={100} />
          )}
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.accent, borderColor: colors.background },
            ]}
          >
            <Ionicons name="camera" size={16} color={colors.onAccent} />
          </View>
        </Pressable>
        <Text style={[styles.change, { color: colors.accent }]} onPress={handlePickImage}>
          Change photo
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <Text style={{ fontSize: 16, color: colors.secondaryText }}>{user?.email}</Text>
      </View>

      <TextField
        label="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="e.g. Tyler"
      />
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="A short line about your collection or taste"
        multiline
      />

      <View style={{ marginTop: 8 }}>
        <Button title="Save Profile" onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingTop: 24, gap: 16 },
  avatarWrap: { alignItems: "center", gap: 10 },
  uploading: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  change: { fontSize: 14, fontWeight: "500" },
  label: { fontSize: 15, fontWeight: "600" },
});
