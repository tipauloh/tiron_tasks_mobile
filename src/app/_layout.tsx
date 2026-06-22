import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppState, AppStateStatus, useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { checkAndApplyUpdate } from '@/lib/updates';
import { queryClient } from '@/lib/query-client';
import { configureNotificationHandler } from '@/lib/notifications';

// Configura o handler de notificações o quanto antes (mostra banner em foreground).
configureNotificationHandler();

function AuthGuard() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Verifica OTA silenciosamente em background
  const runOtaCheck = () => {
    checkAndApplyUpdate().then((result) => {
      if (result.status === 'error') {
        console.warn('[OTA] Falha na verificação automática:', result.error);
      }
      // 'updated' → reloadAsync já é chamado internamente
      // 'up-to-date' e 'skipped' → nada a fazer
    });
  };

  useEffect(() => {
    restoreSession().then(() => {
      // Após restaurar sessão, verifica OTA silenciosamente
      runOtaCheck();
    });

    // Listener para re-verificar quando o app volta do background
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        runOtaCheck();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="task/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
<Stack.Screen
          name="create-task"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="create-list"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="edit-list/[id]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="change-password"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="edit-lists"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
