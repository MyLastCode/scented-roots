import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Button,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const CLOUDINARY_CLOUD_NAME = "qkpbnofd";
const CLOUDINARY_UPLOAD_PRESET = "fragrance_app_unsigned";

export default function AddFromCatalogScreen() {
  const router = useRouter();
  const { catalogId, name, brand, notes } = useLocalSearchParams<{
    catalogId: string;
    name: string;
    brand: string;
    notes: string;
  }>();

  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || saving) return;

    setSaving(true);
    try {
      await addDoc(collection(db, "fragrances"), {
        name,
        brand,
        notes,
        photoURL: photoURL || null,
        createdAt: new Date(),
        userId: user.uid,
        // Keeps a link back to the catalog entry this came from, in case
        // future screens want to show extra catalog detail (rating, accords,
        // Fragrantica link, etc.) without duplicating everything here.
        catalogFragranceId: catalogId,
      });
      router.replace("/");
    } catch (error) {
      console.error("Error adding fragrance:", error);
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={handlePickImage} style={styles.imageWrapper}>
        {uploading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Add Your Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.brand}>{brand}</Text>
      {notes ? <Text style={styles.notes}>{notes}</Text> : null}

      <View style={styles.buttonWrapper}>
        <Button
          title={saving ? "Adding..." : "Add to My Collection"}
          onPress={handleAdd}
          disabled={saving || uploading}
          color={colors.accent}
        />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colors.background },
    imageWrapper: { alignSelf: "center", marginVertical: 10 },
    image: { width: 140, height: 140, borderRadius: 14 },
    imagePlaceholder: {
      width: 140,
      height: 140,
      borderRadius: 14,
      backgroundColor: colors.placeholder,
      alignItems: "center",
      justifyContent: "center",
    },
    imagePlaceholderText: {
      color: colors.placeholderText,
      fontSize: 12,
      textAlign: "center",
      paddingHorizontal: 10,
    },
    name: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginTop: 16,
    },
    brand: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: "center",
      marginTop: 4,
    },
    notes: {
      fontSize: 14,
      color: colors.tertiaryText,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 20,
    },
    buttonWrapper: { marginTop: 28, marginBottom: 40 },
  });
}
