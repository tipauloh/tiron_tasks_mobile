// Microsoft 365 — agendador de sincronização automática.
//
// Roda um sync ao abrir o app e a cada SYNC_INTERVAL_MS (30 min), com guard:
//   - só se há conta conectada + token no Secure Store;
//   - só se passou o intervalo desde o último lastSyncAt;
//   - sem travar a UI (chamadas async em background).
//
// Não dispara navegação nem alerta — falhas são logadas e silenciadas (o usuário
// vê o estado pelo card de status na tela do módulo).

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SYNC_INTERVAL_MS } from '../constants';
import { microsoft365Service, realMicrosoft365Service } from '../services';
import { ms365Logger } from '../utils/logger';
import { useAuthStore } from '@/store/auth-store';

/** Decide se deve sincronizar agora (conectado + intervalo vencido). */
async function shouldSync(): Promise<boolean> {
  const viable = await realMicrosoft365Service.hasViableSession();
  if (!viable) return false;
  const state = microsoft365Service.getConnectionState();
  if (!state.isConnected) return false;
  const last = state.lastSyncAt ?? 0;
  return Date.now() - last >= SYNC_INTERVAL_MS;
}

/**
 * Hook montado uma vez (no root). Agenda o sync automático do Microsoft 365.
 */
export function useMicrosoft365AutoSync(): void {
  const qc = useQueryClient();
  const inFlight = useRef(false);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    let cancelled = false;

    const runIfDue = async () => {
      if (inFlight.current) return;
      try {
        if (!(await shouldSync())) return;
        inFlight.current = true;
        ms365Logger.info('microsoft_sync', 'auto-sync disparado');
        await microsoft365Service.syncNow();
        if (!cancelled) {
          qc.invalidateQueries({ queryKey: ['ms365'] });
          // O sync cria/atualiza tarefas na lista "E-mail Sinalizados".
          qc.invalidateQueries({ queryKey: ['task-lists'] });
          qc.invalidateQueries({ queryKey: ['tasks'] });
        }
      } catch (err) {
        ms365Logger.warn('microsoft_sync', 'auto-sync falhou', {
          error: err instanceof Error ? err.name : 'unknown',
        });
      } finally {
        inFlight.current = false;
      }
    };

    // Restaura contas conectadas em OUTRO dispositivo (baixa metadados + tokens
    // do backend) e então sincroniza. Best-effort — sem conta/rede é silencioso.
    const restoreThenSync = async () => {
      if (userId != null) {
        try {
          const restored = await realMicrosoft365Service.restoreFromRemote(String(userId));
          if (restored > 0 && !cancelled) {
            qc.invalidateQueries({ queryKey: ['ms365'] });
          }
        } catch {
          // best-effort
        }
      }
      await runIfDue();
    };

    // 1) Ao abrir o app.
    void restoreThenSync();

    // 2) A cada intervalo (o guard interno evita sync prematuro).
    const interval = setInterval(() => void runIfDue(), SYNC_INTERVAL_MS);

    // 3) Ao voltar do background.
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void runIfDue();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [qc, userId]);
}
