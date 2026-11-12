import { FirebaseError, getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  confirmPasswordReset,
  inMemoryPersistence,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfig } from "../../firebaseConfig";

const CHECK_APP_NAME = "password-reuse-check";
let checkAuth: Auth | null = null;

// A second, in-memory Auth instance. Signing in here never touches the app's
// real session, so the auth listener in _layout.tsx doesn't fire.
function getCheckAuth(): Auth {
  if (checkAuth) return checkAuth;
  const app = getApps().some((a) => a.name === CHECK_APP_NAME)
    ? getApp(CHECK_APP_NAME)
    : initializeApp(firebaseConfig, CHECK_APP_NAME);
  checkAuth = initializeAuth(app, { persistence: inMemoryPersistence });
  return checkAuth;
}

export class PasswordReuseError extends Error {}

// Firebase never exposes the old password, so the only way to tell whether
// the new one matches it is to try signing in with it before resetting.
async function isCurrentPassword(email: string, password: string) {
  const check = getCheckAuth();
  try {
    await signInWithEmailAndPassword(check, email, password);
    await signOut(check);
    return true;
  } catch (e) {
    const code = (e as FirebaseError).code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return false;
    }
    // Can't confirm either way (rate limited, offline...). Fail closed so we
    // never let a reused password through unchecked.
    throw e;
  }
}

export async function resetPasswordWithoutReuse(
  oobCode: string,
  email: string,
  newPassword: string,
) {
  if (await isCurrentPassword(email, newPassword)) {
    throw new PasswordReuseError(
      "Your new password can't be the same as your current one.",
    );
  }
  await confirmPasswordReset(auth, oobCode, newPassword);
}
