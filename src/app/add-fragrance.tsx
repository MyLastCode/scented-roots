import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { radii } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { uploadImage } from "../lib/cloudinary";

export default function AddFragranceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to add a picture.");
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
      setPhotoURL(await uploadImage(result.assets[0].uri, "fragrance.jpg"));
    } catch (error: any) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Give your fragrance a name.");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await addDoc(collection(db, "fragrances"), {
        name: name.trim(),
        brand: brand.trim(),
        notes: notes.trim(),
        photoURL: photoURL || null,
        createdAt: new Date(),
        userId: user.uid,
      });
      router.back();
    } catch (error: any) {
      Alert.alert("Couldn't save fragrance", error.message);
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Button
        title="Search Existing Fragrances"
        variant="soft"
        onPress={() => router.push("/catalog-search")}
        icon={<Ionicons name="search" size={18} color={colors.accent} />}
      />

      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
        <Text style={{ color: colors.tertiaryText, fontSize: 13 }}>or add manually</Text>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>

      <Pressable
        onPress={handlePickImage}
        style={[styles.photo, { backgroundColor: colors.placeholder }]}
      >
        {uploading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.photoImage} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={26} color={colors.placeholderText} />
            <Text style={{ color: colors.placeholderText, fontSize: 12 }}>Add Photo</Text>
          </>
        )}
      </Pressable>

      <TextField
        label="Fragrance Name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (nameError) setNameError(null);
        }}
        placeholder="e.g. Sauvage"
        error={nameError}
      />
      <TextField
        label="Brand"
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g. Dior"
      />
      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Bergamot, pepper, ambroxan"
        multiline
      />

      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <Button title="Save Fragrance" onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flex: 1, height: 1 },
  photo: {
    width: 120,
    height: 120,
    borderRadius: radii.xl,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
  },
  photoImage: { width: "100%", height: "100%" },
});
