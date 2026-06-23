import { useAuthStore } from '@/store/auth-store';
import { SYSTEM_TZ } from '@/utils/timezone';

/**
 * Fuso horário escolhido pelo usuário (carregado do /me no login e atualizado
 * ao salvar no perfil). Default: America/Sao_Paulo (Brasília).
 */
export function useTimezone(): string {
  return useAuthStore((s) => s.user?.timezone) ?? SYSTEM_TZ;
}
