import { QueryClient } from '@tanstack/react-query';

// QueryClient singleton compartilhado entre o provider (em _layout) e o
// auth-store (que limpa o cache no logout / 401 / troca de usuário, para que
// dados de um usuário nunca vazem para outro no mesmo dispositivo).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
