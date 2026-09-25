import { doc, getDoc, increment, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebaseConfig";

// Deterministic doc ID means "already following?" is a single getDoc instead
// of a query, and prevents duplicate follow docs for the same pair.
function followId(followerId: string, followingId: string) {
  return `${followerId}_${followingId}`;
}

export function useFollow(targetUserId: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const check = async () => {
      if (!currentUser || !targetUserId || currentUser.uid === targetUserId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const snap = await getDoc(
        doc(db, "follows", followId(currentUser.uid, targetUserId)),
      );
      setIsFollowing(snap.exists());
      setLoading(false);
    };
    check();
  }, [targetUserId, currentUser?.uid]);

  const toggleFollow = async () => {
    if (!currentUser || !targetUserId || busy) return;
    setBusy(true);

    const followRef = doc(
      db,
      "follows",
      followId(currentUser.uid, targetUserId),
    );
    const meRef = doc(db, "users", currentUser.uid);
    const themRef = doc(db, "users", targetUserId);

    try {
      if (isFollowing) {
        const batch = writeBatch(db);
        batch.delete(followRef);
        batch.set(meRef, { followingCount: increment(-1) }, { merge: true });
        batch.set(themRef, { followerCount: increment(-1) }, { merge: true });
        await batch.commit();
        setIsFollowing(false);
      } else {
        const batch = writeBatch(db);
        batch.set(followRef, {
          followerId: currentUser.uid,
          followingId: targetUserId,
          createdAt: new Date(),
        });
        batch.set(meRef, { followingCount: increment(1) }, { merge: true });
        batch.set(themRef, { followerCount: increment(1) }, { merge: true });
        await batch.commit();
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setBusy(false);
    }
  };

  return { isFollowing, loading, busy, toggleFollow };
}

// Convenience for one-off unfollow from a followers/following list, where
// you don't need the full hook's "am I following them" check.
export async function unfollow(followerId: string, followingId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "follows", `${followerId}_${followingId}`));
  batch.set(
    doc(db, "users", followerId),
    { followingCount: increment(-1) },
    { merge: true },
  );
  batch.set(
    doc(db, "users", followingId),
    { followerCount: increment(-1) },
    { merge: true },
  );
  await batch.commit();
}
