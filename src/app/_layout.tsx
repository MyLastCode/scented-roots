import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, useRouter, useSegments } from "expo-router";
import * as NativeSplash from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { auth } from "../../firebaseConfig";
import { SettingsButton } from "../components/SettingsButton";
import SplashScreen from "../components/SplashScreen";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { clearBlockedCache } from "../lib/moderation";
import { clearCollectionCache } from "../services/collectionCache";
import { clearFeedCache, fetchFeed } from "../services/feedCache";

NativeSplash.preventAutoHideAsync();
NativeSplash.setOptions({ fade: true, duration: 250 });

// Screens a signed-out user is allowed to see. Signed-in users are sent on
// to the Feed from these.
const PUBLIC_ROUTES = new Set(["login", "signup", "terms", "forgot-password"]);
// Opened from the password-reset email; usable whether or not anyone is
// signed in on this device, so the auth redirects leave it alone.
const OPEN_ROUTES = new Set(["reset-password"]);

function RootLayoutNav() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const { theme, colors } = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchFeed().catch(() => {});
      } else {
        // Signed out or account deleted: drop everything cached in memory
        // so the next person to sign in on this device never sees it.
        clearFeedCache();
        clearCollectionCache();
        clearBlockedCache();
      }
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (initializing) return;

    const first: string = segments[0] ?? "";
    const onVerify = first === "verify-email";
    if (OPEN_ROUTES.has(first)) return;

    if (!user) {
      if (!PUBLIC_ROUTES.has(first)) router.replace("/login");
    } else if (!user.emailVerified) {
      if (!onVerify && first !== "terms") router.replace("/verify-email");
    } else if (PUBLIC_ROUTES.has(first) || onVerify) {
      router.replace("/feed");
    }
  }, [user, initializing, segments, router]);

  // Hand off from the native splash to the in-app one as soon as fonts are
  // ready; the in-app splash stays up until auth state is known.
  useEffect(() => {
    if (fontsLoaded) NativeSplash.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={initializing || theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ title: "Terms & Conditions" }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "Reset Password" }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ title: "Account", headerBackVisible: false }}
        />
        <Stack.Screen
          name="add-fragrance"
          options={{ title: "Add Fragrance", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="catalog-search"
          options={{ title: "Search Catalog" }}
        />
        <Stack.Screen
          name="add-from-catalog"
          options={{ title: "Add to Collection" }}
        />
        <Stack.Screen
          name="detail/[id]"
          options={{
            title: "Fragrance Detail",
            headerRight: () => <SettingsButton />,
          }}
        />
        <Stack.Screen name="profile" options={{ title: "My Profile" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen
          name="new-post"
          options={{ title: "New Post", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="post/[id]" options={{ title: "Post" }} />
        <Stack.Screen name="user/[id]" options={{ title: "" }} />
        <Stack.Screen name="follows/[id]" options={{ title: "" }} />
        <Stack.Screen name="blocked" options={{ title: "Blocked Collectors" }} />
        <Stack.Screen name="delete-account" options={{ title: "Delete Account" }} />
      </Stack>
      {initializing ? <SplashScreen /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
