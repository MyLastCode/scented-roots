import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { unfollow } from "../hooks/useFollow";

// ---------- blocking ----------
// Blocks live at users/{me}/blocks/{blockedUserId}, readable only by "me".
// Blocking hides that person's posts, comments and profile from you and
// removes your follow of them. They aren't notified.

export type BlockedUser = {
  id: string;
  displayName: string;
  photoURL: string | null;
};

// Kept in memory so the Feed, Discover and Post screens don't each re-read
// the block list. Tied to a uid so switching accounts never reuses it.
let cache: { uid: string; ids: Set<string> } | null = null;

export async function loadBlockedIds(): Promise<Set<string>> {
  const uid = auth.currentUser?.uid;
  if (!uid) return new Set();
  if (cache?.uid === uid) return cache.ids;
  try {
    const snap = await getDocs(collection(db, "users", uid, "blocks"));
    cache = { uid, ids: new Set(snap.docs.map((d) => d.id)) };
  } catch (error) {
    // Don't break the screen if this fails (e.g. offline); just hide nothing.
    console.error("Error loading blocked users:", error);
    return new Set();
  }
  return cache.ids;
}

export function clearBlockedCache() {
  cache = null;
}

export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "blocks"));
  return snap.docs.map((d) => ({
    id: d.id,
    displayName: d.data().displayName || "Unnamed Collector",
    photoURL: d.data().photoURL ?? null,
  }));
}

export async function blockUser(user: BlockedUser) {
  const uid = auth.currentUser?.uid;
  if (!uid || uid === user.id) return;

  await setDoc(doc(db, "users", uid, "blocks", user.id), {
    // Saved so the Blocked list in Settings can show a name without
    // reading their profile.
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  });

  // Stop following them. Only unfollow if the follow exists, otherwise the
  // follower counts would go out of sync.
  const followSnap = await getDoc(doc(db, "follows", `${uid}_${user.id}`));
  if (followSnap.exists()) await unfollow(uid, user.id);

  (await loadBlockedIds()).add(user.id);
}

export async function unblockUser(userId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "blocks", userId));
  (await loadBlockedIds()).delete(userId);
}

// ---------- reporting ----------
// Reports are write-only from the app. Review them in the Firebase console
// (Firestore > reports) and remove content there if needed.

export type ReportTarget =
  | { type: "post"; postId: string; targetUserId: string }
  | { type: "comment"; postId: string; commentId: string; targetUserId: string }
  | { type: "user"; targetUserId: string };

export const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or hate",
  "Nudity or sexual content",
  "Something else",
];

export async function submitReport(target: ReportTarget, reason: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await addDoc(collection(db, "reports"), {
    reporterId: uid,
    targetType: target.type,
    targetUserId: target.targetUserId,
    // `"postId" in target` checks whether this kind of report has a post.
    postId: "postId" in target ? target.postId : null,
    commentId: target.type === "comment" ? target.commentId : null,
    reason,
    status: "open",
    createdAt: serverTimestamp(),
  });
}
