import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";
import { ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

const CLOUDINARY_CLOUD_NAME = "qkpbnofd";
const CLOUDINARY_UPLOAD_PRESET = "fragrance_app_unsigned";

export default function FragranceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const docSnap = await getDoc(doc(db, "fragrances", id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setBrand(data.brand || "");
        setNotes(data.notes || "");
        setPhotoURL(data.photoURL || null);
      }
      setLoading(false);
    };
    load();
  }, [id]);

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
    if (!id || !name.trim()) return;
    await updateDoc(doc(db, "fragrances", id), {
      name,
      brand,
      notes,
      photoURL: photoURL || null,
    });
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete Fragrance",
      `Remove "${name || "this fragrance"}" from your collection? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(db, "fragrances", id));
              router.back();
            } catch (error) {
              console.error("Error deleting fragrance:", error);
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );

  return (
    <ScrollView style={styles.container}>
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
        placeholderTextColor={colors.tertiaryText}
      />

      <Text style={styles.label}>Brand</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholderTextColor={colors.tertiaryText}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholderTextColor={colors.tertiaryText}
        multiline
      />

      <View style={styles.buttonWrapper}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          color={colors.accent}
          disabled={deleting || uploading}
        />
      </View>

      <View style={styles.deleteButtonWrapper}>
        <Button
          title={deleting ? "Deleting..." : "Delete Fragrance"}
          onPress={handleDelete}
          color={colors.error}
          disabled={deleting}
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
    buttonWrapper: { marginTop: 24 },
    deleteButtonWrapper: { marginTop: 16, marginBottom: 40 },
  });
}
