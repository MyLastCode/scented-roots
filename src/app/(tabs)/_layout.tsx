import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { NewPostButton } from "../../components/NewPostButton";
import { SettingsButton } from "../../components/SettingsButton";
import { useTheme } from "../../context/ThemeContext";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
   <Tabs
  initialRouteName="feed"
  screenOptions={{
    lazy: false,
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerRight: () => <SettingsButton />,
    sceneStyle: { backgroundColor: colors.background },
    tabBarStyle: {
      backgroundColor: colors.card,
      borderTopColor: colors.divider,
    },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.tertiaryText,
  }}
>

      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          headerLeft: () => <NewPostButton />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "My Collection",
          tabBarLabel: "Collection",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
