import {
  Inter_400Regular,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { auth } from "../../firebaseConfig";
import { SettingsButton } from "../components/SettingsButton";
import { fonts } from "../constants/fonts";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
SplashScreen.preventAutoHideAsync();

// Makes Inter the default for every Text that doesn't explicitly set its own
// fontFamily (headings still opt into fonts.serifSemiBold for bold).
// @ts-ignore - defaultProps isn't in RN's official Text types
Text.defaultProps = Text.defaultProps || {};
// @ts-ignore
Text.defaultProps.style = [
  { fontFamily: fonts.regular },
  // @ts-ignore
  Text.defaultProps.style,
];

function RootLayoutNav() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const { theme, colors } = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, []);

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
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-fragrance"
          options={{ title: "Add Fragrance" }}
        />
        <Stack.Screen
          name="catalog-search"
          options={{ title: "Search Catalog" }}
        />
        <Stack.Screen
          name="add-from-catalog"
          options={{ title: "Add Fragrance" }}
        />
        <Stack.Screen
          name="detail/[id]"
          options={{ title: "Fragrance Detail" }}
        />
        <Stack.Screen name="user/[id]" options={{ title: "Collector" }} />
        <Stack.Screen name="post/[id]" options={{ title: "Post" }} />
        <Stack.Screen name="profile" options={{ title: "Edit Profile" }} />
        <Stack.Screen
          name="new-post"
          options={{ title: "New Post", animation: "slide_from_bottom" }}
        />
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
