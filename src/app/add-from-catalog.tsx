import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
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
import Chip from "../components/ui/Chip";
import { radii } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { uploadImage } from "../lib/cloudinary";

type CatalogFragrance = {
  name: string;
  brand: string;
  year: number | null;
  notesTop: string[];
  notesMiddle: string[];
  notesBase: string[];
  accords: string[];
};

export default function AddFromCatalogScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [fragrance, setFragrance] = useState<CatalogFragrance | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "fragrances", id));
      if (snap.exists()) {
        const d = snap.data();
        setFragrance({
          name: d.name || "",
          brand: d.brand || "",
          year: d.year ?? null,
          notesTop: d.notesTop || [],
          notesMiddle: d.notesMiddle || [],
          notesBase: d.notesBase || [],
          accords: d.accords || [],
        });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to add your own picture.");
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
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async (withPhoto: boolean) => {
    const user = auth.currentUser;
    if (!user || !fragrance || !id) return;

    setSaving(true);
    try {
      await addDoc(collection(db, "fragrances"), {
        name: fragrance.name,
        brand: fragrance.brand,
        notes: [...fragrance.notesTop, ...fragrance.notesMiddle, ...fragrance.notesBase].join(", "),
        accords: fragrance.accords,
        photoURL: withPhoto ? photoURL : null,
        createdAt: new Date(),
        userId: user.uid,
        catalogFragranceId: id,
      });
      router.dismissAll();
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Couldn't add fragrance", e.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!fragrance) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.secondaryText }}>This fragrance couldn&apos;t be found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}
      >
        <Text style={[styles.name, { color: colors.text }]}>{fragrance.name}</Text>
        <Text style={[styles.brand, { color: colors.secondaryText }]}>
          {fragrance.brand}
          {fragrance.year ? ` · ${fragrance.year}` : ""}
        </Text>
        {fragrance.accords.length > 0 ? (
          <View style={styles.chips}>
            {fragrance.accords.slice(0, 4).map((a) => (
              <Chip key={a} label={a} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>Your photo</Text>
        <Text style={{ fontSize: 13, color: colors.tertiaryText }}>Optional</Text>
      </View>

      <Pressable
        onPress={handlePickPhoto}
        style={[styles.picker, { backgroundColor: colors.placeholder }]}
      >
        {uploading ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.pickerImage} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={34} color={colors.placeholderText} />
            <Text style={[styles.pickerTitle, { color: colors.placeholderText }]}>
              Add a photo of your bottle
            </Text>
            <Text style={{ fontSize: 12, color: colors.placeholderText }}>
              Shows on your collection grid
            </Text>
          </>
        )}
      </Pressable>

      <Button
        title="Add to Collection"
        onPress={() => handleAdd(true)}
        loading={saving}
        disabled={uploading}
      />
      {!photoURL ? null : (
        <Text
          style={[styles.link, { color: colors.secondaryText }]}
          onPress={() => setPhotoURL(null)}
        >
          Remove photo
        </Text>
      )}
      <Text
        style={[styles.link, { color: colors.accent, fontWeight: "500" }]}
        onPress={() => handleAdd(false)}
      >
        Add without a photo
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16 },
  card: { padding: 16, gap: 8, borderRadius: radii.xl, borderWidth: 1 },
  name: { fontSize: 24, fontWeight: "700" },
  brand: { fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 16, fontWeight: "600" },
  picker: {
    height: 230,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  pickerImage: { width: "100%", height: "100%" },
  pickerTitle: { fontSize: 15, fontWeight: "600" },
  link: { textAlign: "center", fontSize: 14 },
});
