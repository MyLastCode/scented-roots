import { router } from "expo-router";
import { auth } from "../../firebaseConfig";

// Tapping someone's name or avatar anywhere in the app goes through here.
// Your own name takes you to your Collection tab instead of a "visitor"
// view of your profile.
export function openProfile(userId: string) {
  if (!userId) return;
  if (userId === auth.currentUser?.uid) {
    router.navigate("/");
  } else {
    router.push(`/user/${userId}`);
  }
}
