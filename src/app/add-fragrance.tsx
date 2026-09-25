import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export default function AddFragranceScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert("Permission to access photos is needed.");
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
      formData.append("file", blob, "fragrance.jpg");
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
    if (!name.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "fragrances"), {
        name,
        brand,
        notes,
        photoURL: photoURL || null,
        createdAt: new Date(),
        userId: user.uid,
      });
      router.back();
    } catch (error) {
      console.error("Error saving fragrance:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        style={styles.searchCatalogButton}
        onPress={() => router.push("/catalog-search")}
      >
        <Text style={styles.searchCatalogButtonText}>
          🔍 Search Existing Fragrances
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or add manually</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity onPress={handlePickImage} style={styles.imageWrapper}>
        {uploading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Fragrance Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Sauvage"
        placeholderTextColor={colors.tertiaryText}
      />

      <Text style={styles.label}>Brand</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g. Dior"
        placeholderTextColor={colors.tertiaryText}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Bergamot, pepper, ambroxan"
        placeholderTextColor={colors.tertiaryText}
        multiline
      />

      <View style={styles.buttonWrapper}>
        <Button
          title="Save Fragrance"
          onPress={handleSave}
          color={colors.accent}
        />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colors.background },
    searchCatalogButton: {
      backgroundColor: colors.accentBackground,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    searchCatalogButtonText: {
      color: colors.accent,
      fontWeight: "600",
      fontSize: 16,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
    dividerText: {
      marginHorizontal: 10,
      color: colors.tertiaryText,
      fontSize: 13,
    },
    imageWrapper: { alignSelf: "center", marginVertical: 10 },
    image: { width: 120, height: 120, borderRadius: 12 },
    imagePlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 12,
      backgroundColor: colors.placeholder,
      alignItems: "center",
      justifyContent: "center",
    },
    imagePlaceholderText: { color: colors.placeholderText, fontSize: 12 },
    label: {
      fontSize: 16,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 6,
      color: colors.text,
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
    multiline: { height: 80, textAlignVertical: "top" },
    buttonWrapper: { marginTop: 24, marginBottom: 40 },
  });
}
