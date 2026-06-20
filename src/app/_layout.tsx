import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 },
  },
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="task/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="list/[id]"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="create-task"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
