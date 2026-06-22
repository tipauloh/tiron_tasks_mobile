// Microsoft 365 — espelha a conclusão de uma TAREFA no flag do e-mail de origem.
//
// Chamado quando uma tarefa vinculada a um e-mail sinalizado é concluída/reaberta.
// É best-effort: nunca lança (a UI da tarefa não deve quebrar se o Graph falhar).
// Só toca o flag/flagStatus — nenhuma outra escrita no e-mail.

import { setEmailFlagComplete, setEmailFlagFlagged } from '../graph';
import { hasStoredSession, MicrosoftReauthRequiredError } from '../auth';
import { GraphError } from '../graph/client';
import { ms365Logger } from '../utils/logger';

export interface MirrorResult {
  ok: boolean;
  /** True se a falha foi por permissão/sessão — o usuário precisa reconectar
   * para reemitir o token com Mail.ReadWrite. */
  needsReconnect: boolean;
}

/**
 * Reflete a conclusão (ou reabertura) da tarefa no e-mail vinculado:
 * `completed` → flag 'complete'; senão → volta a 'flagged'.
 */
export async function mirrorTaskCompletionToEmail(
  messageId: string,
  completed: boolean,
): Promise<MirrorResult> {
  try {
    // Sem sessão Microsoft ativa não há o que espelhar (conta desconectada).
    if (!(await hasStoredSession())) {
      return { ok: false, needsReconnect: false };
    }
    if (completed) {
      await setEmailFlagComplete(messageId);
    } else {
      await setEmailFlagFlagged(messageId);
    }
    return { ok: true, needsReconnect: false };
  } catch (err) {
    const needsReconnect =
      err instanceof MicrosoftReauthRequiredError ||
      (err instanceof GraphError && (err.status === 403 || err.status === 401));
    ms365Logger.warn('microsoft_graph', 'falha ao espelhar conclusão no e-mail', {
      error: err instanceof Error ? err.name : 'unknown',
      needsReconnect,
    });
    return { ok: false, needsReconnect };
  }
}
