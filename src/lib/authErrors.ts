import { FirebaseError } from "firebase/app";

// Firebase's own error messages look like
// "Firebase: Error (auth/invalid-credential)." They're confusing for users
// and reveal internals, so we map the codes we expect to plain sentences.
const MESSAGES: Record<string, string> = {
  // Login. Firebase returns invalid-credential for both "no such account"
  // and "wrong password", so the message doesn't reveal which one it was.
  "auth/invalid-credential": "That email and password don't match. Try again.",
  "auth/wrong-password": "That email and password don't match. Try again.",
  "auth/user-not-found": "That email and password don't match. Try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/missing-password": "Enter your password.",

  // Sign up
  "auth/email-already-in-use":
    "An account with this email already exists. Try logging in instead.",
  "auth/weak-password": "That password is too weak. Try a longer one.",
  "auth/password-does-not-meet-requirements":
    "That password doesn't meet the requirements. Try a longer one with letters and numbers.",

  // Re-entering your password (e.g. before deleting your account)
  "auth/requires-recent-login": "Please log out and back in, then try again.",

  // Anywhere
  "auth/too-many-requests":
    "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed":
    "Couldn't reach the server. Check your connection and try again.",
};

export function authErrorMessage(error: unknown, fallback: string): string {
  // `instanceof` checks which class an object was created from. Errors from
  // Firebase are FirebaseError objects that carry a `code` string.
  if (error instanceof FirebaseError && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  return fallback;
}
