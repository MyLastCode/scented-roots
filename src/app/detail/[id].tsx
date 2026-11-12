import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
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
import { db } from "../../../firebaseConfig";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import TextField from "../../components/ui/TextField";
import { gradientFor, radii, ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { uploadImage } from "../../lib/cloudinary";

// Extra detail pulled from the catalog entry this fragrance was added from.
type CatalogInfo = {
  year: number | null;
  gender: string | null;
  notesTop: string[];
  notesMiddle: string[];
  notesBase: string[];
  accords: string[];
};

const HERO_HEIGHT = 300;

export default function FragranceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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

        if (data.catalogFragranceId) {
          try {
            const catSnap = await getDoc(
              doc(db, "fragrances", data.catalogFragranceId),
            );
            if (catSnap.exists()) {
              const c = catSnap.data();
              setCatalog({
                year: c.year ?? null,
                gender: c.gender ?? null,
                notesTop: c.notesTop || [],
                notesMiddle: c.notesMiddle || [],
                notesBase: c.notesBase || [],
                accords: c.accords || [],
              });
            }
          } catch (error) {
            console.error("Error loading catalog details:", error);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

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
      console.error("Error uploading image:", error);
      Alert.alert("Upload failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "fragrances", id), {
        name: name.trim(),
        brand: brand.trim(),
        notes: notes.trim(),
        photoURL: photoURL || null,
      });
      router.back();
    } catch (error: any) {
      Alert.alert("Couldn't save changes", error.message);
      setSaving(false);
    }
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );

  // Prefer the catalog's top/heart/base tiers; otherwise fall back to the
  // comma-separated notes the user typed.
  const typedNotes = notes
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const tiers = catalog
    ? [
        { label: "TOP", items: catalog.notesTop },
        { label: "HEART", items: catalog.notesMiddle },
        { label: "BASE", items: catalog.notesBase },
      ].filter((t) => t.items.length > 0)
    : [];
  const showTiers = tiers.length > 0;
  const showTypedNotes = !showTiers && typedNotes.length > 0;

  const subtitle = [brand, catalog?.year].filter(Boolean).join(" · ");

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Pressable onPress={handlePickImage}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.hero} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={gradientFor(name || brand || "fragrance")}
            style={[styles.hero, styles.heroCenter]}
          >
            <Ionicons name="flask-outline" size={84} color="rgba(255,255,255,0.55)" />
          </LinearGradient>
        )}
        {uploading ? (
          <View style={[styles.hero, styles.heroOverlay]}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : null}
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={18} color={colors.onAccent} />
        </View>
      </Pressable>

      <View style={styles.content}>
        <View style={{ gap: 6 }}>
          <Text style={styles.title}>{name || "Untitled fragrance"}</Text>
          <View style={styles.subtitleRow}>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {catalog?.gender ? (
              <View style={styles.genderTag}>
                <Text style={styles.genderText}>{catalog.gender}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {catalog && catalog.accords.length > 0 ? (
          <View style={styles.chipRow}>
            {catalog.accords.slice(0, 6).map((a) => (
              <Chip key={a} label={a} />
            ))}
          </View>
        ) : null}

        {showTiers || showTypedNotes ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.pyramid}>
              {showTiers
                ? tiers.map((tier) => (
                    <View key={tier.label} style={styles.tierRow}>
                      <Text style={styles.tierLabel}>{tier.label}</Text>
                      <View style={styles.pillWrap}>
                        {tier.items.map((n) => (
                          <NotePill key={n} label={n} colors={colors} />
                        ))}
                      </View>
                    </View>
                  ))
                : (
                    <View style={styles.pillWrap}>
                      {typedNotes.map((n) => (
                        <NotePill key={n} label={n} colors={colors} />
                      ))}
                    </View>
                  )}
            </View>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Edit details</Text>
        <TextField label="Fragrance Name" value={name} onChangeText={setName} />
        <TextField label="Brand" value={brand} onChangeText={setBrand} />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="e.g. Bergamot, pepper, ambroxan"
        />

        <View style={{ gap: 12, marginTop: 8 }}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={deleting || uploading || !name.trim()}
          />
          <Button
            title={deleting ? "Deleting..." : "Delete Fragrance"}
            variant="danger"
            onPress={handleDelete}
            disabled={deleting || saving}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function NotePill({ label, colors }: { label: string; colors: ThemeColors }) {
  return (
    <View
      style={{
        backgroundColor: colors.accentBackground,
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 12,
      }}
    >
      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    hero: { width: "100%", height: HERO_HEIGHT },
    heroCenter: { alignItems: "center", justifyContent: "center" },
    heroOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    cameraBadge: {
      position: "absolute",
      right: 16,
      bottom: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    content: { padding: 20, gap: 16 },
    title: { fontSize: 30, fontWeight: "700", color: colors.text },
    subtitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    subtitle: { fontSize: 15, color: colors.secondaryText },
    genderTag: {
      backgroundColor: colors.accentBackground,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    genderText: { fontSize: 12, fontWeight: "500", color: colors.accent },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
    pyramid: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: radii.xl,
      padding: 16,
      gap: 14,
    },
    tierRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    tierLabel: {
      width: 52,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
      color: colors.tertiaryText,
    },
    pillWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
    divider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },
  });
}
