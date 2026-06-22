// Microsoft 365 — espelha a conclusão de uma TAREFA no flag do e-mail de origem.
//
// Chamado quando uma tarefa vinculada a um e-mail sinalizado é concluída/reaberta.
// É best-effort: nunca lança (a UI da tarefa não deve quebrar se o Graph falhar).
// Só toca o flag/flagStatus — nenhuma outra escrita no e-mail.

import { setEmailFlagComplete, setEmailFlagFlagged } from '../graph';
import { hasStoredSession, MicrosoftReauthRequiredError } from '../auth';
import { GraphError } from '../graph/client';
import { microsoftAccountRepository } from '../repositories';
import { ms365Logger } from '../utils/logger';

/** Compat. retro: acha a 1ª conta com sessão armazenada quando o accountId é desconhecido. */
async function resolveAnyAccountId(): Promise<string | null> {
  const accounts = microsoftAccountRepository.getAccounts();
  for (const account of accounts) {
    if (await hasStoredSession(account.id)) return account.id;
  }
  return null;
}

export interface MirrorResult {
  ok: boolean;
  /** True se a falha foi por permissão/sessão — o usuário precisa reconectar
   * para reemitir o token com Mail.ReadWrite. */
  needsReconnect: boolean;
}

/**
 * Reflete a conclusão (ou reabertura) da tarefa no e-mail vinculado da CONTA:
 * `completed` → flag 'complete'; senão → volta a 'flagged'.
 *
 * MULTI-CONTA: o `accountId` (= external_account_id da tarefa) diz qual conta
 * Microsoft é dona do e-mail. Se ausente (compat. retro com tarefas antigas),
 * tenta a primeira conta que tiver sessão armazenada.
 */
export async function mirrorTaskCompletionToEmail(
  messageId: string,
  completed: boolean,
  accountId?: string,
): Promise<MirrorResult> {
  try {
    const resolvedAccountId = accountId ?? (await resolveAnyAccountId());
    // Sem sessão Microsoft ativa não há o que espelhar (conta desconectada).
    if (!resolvedAccountId || !(await hasStoredSession(resolvedAccountId))) {
      return { ok: false, needsReconnect: false };
    }
    if (completed) {
      await setEmailFlagComplete(messageId, resolvedAccountId);
    } else {
      await setEmailFlagFlagged(messageId, resolvedAccountId);
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
