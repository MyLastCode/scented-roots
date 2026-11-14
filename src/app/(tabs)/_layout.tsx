import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { NewPostButton } from "../../components/NewPostButton";
import { SettingsButton } from "../../components/SettingsButton";
import { useTheme } from "../../context/ThemeContext";

// Expo Router reads the starting tab from this export. The <Tabs> component
// itself has no `initialRouteName` prop, which is what TypeScript was
// complaining about.
export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        lazy: false,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        headerShadowVisible: false,
        headerRight: () => <SettingsButton />,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.divider,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tertiaryText,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={24} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          // New Post sits on the right with Settings; the left side of a
          // header is where people expect a back button.
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
              <NewPostButton />
              <SettingsButton />
            </View>
          ),
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={24} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "My Collection",
          tabBarLabel: "Collection",
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={24} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
