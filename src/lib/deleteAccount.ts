import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  increment,
  query,
  where,
  writeBatch,
  WriteBatch,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

// Runs `add` for each item, committing in batches of `size`.
// (A Firestore batch can hold at most 500 writes.)
async function commitInChunks<T>(
  items: T[],
  add: (batch: WriteBatch, item: T) => void,
  size: number,
) {
  for (let i = 0; i < items.length; i += size) {
    const batch = writeBatch(db);
    items.slice(i, i + size).forEach((item) => add(batch, item));
    await batch.commit();
  }
}

// Deleting a document in Firestore does NOT delete its subcollections, so
// a post's comments have to be removed first or they'd be left behind.
export async function deletePostWithComments(postId: string) {
  const comments = await getDocs(collection(db, "posts", postId, "comments"));
  // Small batches: the security rules look up the post for each delete,
  // and rules allow only a limited number of lookups per batch.
  await commitInChunks(comments.docs, (batch, d) => batch.delete(d.ref), 10);
  await deleteDoc(doc(db, "posts", postId));
}

// Decrement a counter on someone else's profile, unless that profile no
// longer exists (an update on a missing doc would fail the whole batch).
async function decrementIfExists(
  batch: WriteBatch,
  ref: DocumentReference,
  field: "followerCount" | "followingCount" | "commentCount",
) {
  if ((await getDoc(ref)).exists()) {
    batch.update(ref, { [field]: increment(-1) });
  }
}

// Permanently deletes the signed-in user's account and everything they
// created. Photos uploaded to Cloudinary are not removed (unsigned uploads
// can't delete); clear them in the Cloudinary console if needed.
export async function deleteAccount(password: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("You're not signed in.");

  // 1. Confirm it's really them. Firebase also requires a recent sign-in
  //    before it lets an account be deleted.
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );
  const uid = user.uid;

  // 2. Their posts, including everyone's comments on them.
  const posts = await getDocs(
    query(collection(db, "posts"), where("userId", "==", uid)),
  );
  for (const post of posts.docs) {
    await deletePostWithComments(post.id);
  }

  // 3. Their comments on other people's posts. collectionGroup searches
  //    every "comments" subcollection at once.
  const comments = await getDocs(
    query(collectionGroup(db, "comments"), where("userId", "==", uid)),
  );
  for (const comment of comments.docs) {
    const batch = writeBatch(db);
    batch.delete(comment.ref);
    // comment.ref.parent is the comments collection; its parent is the post.
    const postRef = comment.ref.parent.parent;
    if (postRef) await decrementIfExists(batch, postRef, "commentCount");
    await batch.commit();
  }

  // 4. Their fragrances.
  const fragrances = await getDocs(
    query(collection(db, "fragrances"), where("userId", "==", uid)),
  );
  await commitInChunks(fragrances.docs, (batch, d) => batch.delete(d.ref), 400);

  // 5. Follows in both directions, fixing the other person's counts.
  //    One per batch, because the rules check each follow individually.
  const [following, followers] = await Promise.all([
    getDocs(query(collection(db, "follows"), where("followerId", "==", uid))),
    getDocs(query(collection(db, "follows"), where("followingId", "==", uid))),
  ]);
  for (const follow of following.docs) {
    const batch = writeBatch(db);
    batch.delete(follow.ref);
    await decrementIfExists(
      batch,
      doc(db, "users", follow.data().followingId),
      "followerCount",
    );
    await batch.commit();
  }
  for (const follow of followers.docs) {
    const batch = writeBatch(db);
    batch.delete(follow.ref);
    await decrementIfExists(
      batch,
      doc(db, "users", follow.data().followerId),
      "followingCount",
    );
    await batch.commit();
  }

  // 6. Their block list, then their profile.
  const blocks = await getDocs(collection(db, "users", uid, "blocks"));
  await commitInChunks(blocks.docs, (batch, d) => batch.delete(d.ref), 400);
  await deleteDoc(doc(db, "users", uid));

  // 7. Finally the login itself. This signs them out, and the root layout
  //    sends them back to the login screen.
  await deleteUser(user);
}
