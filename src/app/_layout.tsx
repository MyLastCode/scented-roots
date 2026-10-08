import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from "@expo-google-fonts/playfair-display";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";
import { auth } from "../../firebaseConfig";
import { fetchFeed } from "../services/feedCache";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
SplashScreen.preventAutoHideAsync();
function SettingsButton() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => router.push("/settings")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingRight: 4 }}
    >
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}

function RootLayoutNav() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const { theme, colors } = useTheme();

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
  setUser(firebaseUser);
  if (firebaseUser) fetchFeed().catch(() => {});
  if (initializing) setInitializing(false);
});

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "login";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/feed");
    }
  }, [user, initializing, segments]);

  const isReady = !initializing && fontsLoaded;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
  screenOptions={{
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    contentStyle: { backgroundColor: colors.background },
    headerRight: () => <SettingsButton />,
    animation: "slide_from_right",
  }}
>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animation: "fade" }}
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
          name="detail/[id]"
          options={{ title: "Fragrance Detail" }}
        />
        <Stack.Screen name="profile" options={{ title: "My Profile" }} />
        <Stack.Screen
          name="settings"
          options={{ title: "Settings", headerRight: () => null }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}