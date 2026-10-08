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
  photoURL?: string | null;
};

export type Profile = {
  displayName: string;
  bio: string;
  photoURL: string | null;
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
    },
  };
  cachedUid = user.uid;
  return cached;
}