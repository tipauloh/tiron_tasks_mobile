import { Tabs } from 'expo-router/js-tabs';
import { Platform, Text } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';

function TabBarIcon({ emoji, label }: { emoji: string; label: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          backgroundColor: palette.surfaceElevated,
          borderTopColor: palette.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => (
            <TabBarIcon emoji="🏠" label="Início" />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color }) => (
            <TabBarIcon emoji="✅" label="Tarefas" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Busca',
          tabBarIcon: ({ color }) => (
            <TabBarIcon emoji="🔍" label="Busca" />
          ),
        }}
      />
    </Tabs>
  );
}
