import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

export type Fragrance = {
  id: string;
  name: string;
  brand: string;
  notes: string;
  // Catalog accords (e.g. "woody", "vanilla"); only set when added from the catalog.
  accords?: string[];
  photoURL?: string | null;
};

export type Profile = {
  displayName: string;
  bio: string;
  photoURL: string | null;
  followerCount: number;
  followingCount: number;
};

export type CollectionData = {
  fragrances: Fragrance[];
  profile: Profile;
};

let cached: CollectionData | null = null;
let cachedUid: string | null = null;

export function getCachedCollection(): CollectionData | null {
  // Never show another account's data after switching users.
  return cachedUid && cachedUid === auth.currentUser?.uid ? cached : null;
}

export function clearCollectionCache() {
  cached = null;
  cachedUid = null;
}

export async function fetchCollection(): Promise<CollectionData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const [fragranceSnap, profileSnap] = await Promise.all([
    getDocs(
      query(collection(db, "fragrances"), where("userId", "==", user.uid)),
    ),
    getDoc(doc(db, "users", user.uid)),
  ]);

  const data = profileSnap.exists() ? profileSnap.data() : {};

  cached = {
    fragrances: fragranceSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Fragrance[],
    profile: {
      displayName: data.displayName || "",
      bio: data.bio || "",
      photoURL: data.photoURL || null,
      // `??` (nullish coalescing) only falls back when the field is missing,
      // so a real count of 0 is kept. Older user docs may not have these yet.
      followerCount: data.followerCount ?? 0,
      followingCount: data.followingCount ?? 0,
    },
  };
  cachedUid = user.uid;
  return cached;
}