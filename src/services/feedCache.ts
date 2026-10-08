import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export type Post = {
  id: string;
  userId: string;
  displayName: string;
  userPhotoURL: string | null;
  caption: string;
  description: string;
  photoURLs: string[];
  commentCount?: number;
  createdAt: { toDate: () => Date } | null;
};

const PAGE_SIZE = 50;

let cachedPosts: Post[] | null = null;

export function getCachedPosts() {
  return cachedPosts;
}

export async function fetchFeed() {
  const snapshot = await getDocs(
    query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE),
    ),
  );
  cachedPosts = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Post[];
  return cachedPosts;
}