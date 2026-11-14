import {
  collection,
  DocumentData,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { SCENT_FAMILIES, scentFamiliesOf } from "./scentFamily";

// A "taste profile" is a weighted bag of lowercase scent words (accords and
// notes) built from a collection. Both recommendation lists score candidates
// by how much of that profile they share.
export type TasteProfile = Map<string, number>;

type ScentDoc = {
  notes?: string;
  accords?: string[];
  notesTop?: string[];
  notesMiddle?: string[];
  notesBase?: string[];
};

const ACCORD_WEIGHT = 2;
const NOTE_WEIGHT = 1;

function splitNotes(notes?: string) {
  return (notes ?? "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

// Every scent word a fragrance (user-owned or catalog) carries.
export function scentWords(f: ScentDoc): Set<string> {
  return new Set([
    ...(f.accords ?? []).map((a) => a.toLowerCase()),
    ...splitNotes(f.notes),
    ...[...(f.notesTop ?? []), ...(f.notesMiddle ?? []), ...(f.notesBase ?? [])]
      .map((n) => n.toLowerCase()),
  ]);
}

export function buildTasteProfile(fragrances: ScentDoc[]): TasteProfile {
  const profile: TasteProfile = new Map();
  const add = (word: string, w: number) =>
    profile.set(word, (profile.get(word) ?? 0) + w);

  for (const f of fragrances) {
    (f.accords ?? []).forEach((a) => add(a.toLowerCase(), ACCORD_WEIGHT));
    splitNotes(f.notes).forEach((n) => add(n, NOTE_WEIGHT));
    // Family words ("woody", "fresh", "sweet") double as catalog accords, so
    // they bridge free-text notes like "cedar" to accord-tagged entries.
    const families = scentFamiliesOf(f);
    SCENT_FAMILIES.forEach(({ key }) => {
      if (families.has(key)) add(key, NOTE_WEIGHT);
    });
  }
  return profile;
}

export function topWords(profile: TasteProfile, n: number) {
  return [...profile.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word]) => word);
}

// Score + the single most influential shared word, used for the "why".
export function scoreAgainst(profile: TasteProfile, words: Set<string>) {
  let score = 0;
  let best: { word: string; weight: number } | null = null;
  words.forEach((word) => {
    const weight = profile.get(word);
    if (!weight) return;
    score += weight;
    if (!best || weight > best.weight) best = { word, weight };
  });
  return { score, reason: (best as { word: string } | null)?.word ?? null };
}

export function capitalize(word: string) {
  return word.replace(/\b\w/g, (c) => c.toUpperCase());
}

export type RecommendedFragrance = {
  id: string;
  name: string;
  brand: string;
  photoURL: string | null;
  reason: string | null;
};

// Fetches catalog entries sharing the user's top accords, then ranks them
// against the full profile. Anything already in the collection is skipped.
export async function recommendFragrances(
  profile: TasteProfile,
  owned: DocumentData[],
  count = 3,
): Promise<RecommendedFragrance[]> {
  const words = topWords(profile, 10);
  if (words.length === 0) return [];

  // array-contains-any is case-sensitive and catalog casing may vary, so ask
  // for both "vanilla" and "Vanilla" (Firestore allows up to 30 values).
  const variants = [...new Set(words.flatMap((w) => [w, capitalize(w)]))];

  const snap = await getDocs(
    query(
      collection(db, "fragrances"),
      where("accords", "array-contains-any", variants.slice(0, 30)),
      limit(80),
    ),
  );

  const ownedCatalogIds = new Set(
    owned.map((f) => f.catalogFragranceId).filter(Boolean),
  );
  const ownedKeys = new Set(
    owned.map((f) => `${f.name}|${f.brand}`.toLowerCase()),
  );

  return snap.docs
    .map((d) => ({ id: d.id, data: d.data() }))
    // User-owned docs share this collection; only approved catalog entries count.
    .filter(({ data }) => data.status === "approved")
    .filter(
      ({ id, data }) =>
        !ownedCatalogIds.has(id) &&
        !ownedKeys.has(`${data.name}|${data.brand}`.toLowerCase()),
    )
    .map(({ id, data }) => {
      const { score, reason } = scoreAgainst(profile, scentWords(data));
      return {
        score,
        rec: {
          id,
          name: data.name || "",
          brand: data.brand || "",
          photoURL: data.photoURL || null,
          reason: reason ? capitalize(reason) : null,
        },
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ rec }) => rec);
}
