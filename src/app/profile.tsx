import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
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

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const CLOUDINARY_CLOUD_NAME =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
  const CLOUDINARY_UPLOAD_PRESET =
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const user = auth.currentUser;

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
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
      await setDoc(doc(db, "users", user.uid), {
        displayName,
        bio,
        photoURL,
        email: user.email,
      });
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

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

      <View style={styles.buttonWrapper}>
        <Button
          title={saving ? "Saving..." : "Save Profile"}
          onPress={handleSave}
          disabled={saving}
          color={colors.accent}
        />
      </View>
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
      height: 200,
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
    buttonWrapper: { marginTop: 24 },
  });
}
