import { Tabs } from "expo-router";
import { useTheme } from "tamagui";
import { Platform } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <>{/* Rendered via tabBarLabel — emoji icon here for accessibility */}</>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const bg = String(theme.background?.val ?? "#09090b");
  const border = String(theme.borderColor?.val ?? "#2c2c2e");
  const active = "#22d3ee";
  const inactive = String(theme.mutedForeground?.val ?? "#a1a1aa");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 84 : 64,
        },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} />,
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🐛" focused={focused} />,
          tabBarLabel: "Reports",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Report Bug",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
          tabBarLabel: "Report",
        }}
      />
      <Tabs.Screen
        name="repos"
        options={{
          title: "Repos",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔗" focused={focused} />,
          tabBarLabel: "Repos",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          tabBarLabel: "Settings",
        }}
      />
    </Tabs>
  );
}
