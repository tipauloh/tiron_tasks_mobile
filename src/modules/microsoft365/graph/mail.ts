// Microsoft 365 — e-mails sinalizados (flagged) via Graph.
//
// Leitura: delta de mensagens é por pasta e não combina com o filtro de flag,
// então usamos $filter=flag/flagStatus eq 'flagged' + paginação nextLink (ADR-002).
// Escrita: APENAS o flag/flagStatus (concluir/re-sinalizar) — nunca corpo, envio,
// pasta ou exclusão. Nenhum corpo/subject é logado.

import { FLAGGED_MAIL_QUERY } from '../constants';
import { graphGetAllPages, graphPatch } from './client';
import type { GraphMessage } from '../types';
import { ms365Logger } from '../utils/logger';

/** Caminho da mensagem (id pode conter caracteres especiais → encode). */
function messagePath(messageId: string): string {
  return `/me/messages/${encodeURIComponent(messageId)}`;
}

/** Marca o e-mail como concluído (flag/flagStatus = 'complete'). */
export async function setEmailFlagComplete(messageId: string): Promise<void> {
  await graphPatch(messagePath(messageId), { flag: { flagStatus: 'complete' } });
  ms365Logger.info('microsoft_graph', 'e-mail marcado como concluído');
}

/** Volta o e-mail a sinalizado (flag/flagStatus = 'flagged') — ao reabrir a tarefa. */
export async function setEmailFlagFlagged(messageId: string): Promise<void> {
  await graphPatch(messagePath(messageId), { flag: { flagStatus: 'flagged' } });
  ms365Logger.info('microsoft_graph', 'e-mail re-sinalizado');
}

/** Busca todos os e-mails sinalizados (paginados) e ordena por data (desc) no
 * cliente — o Graph rejeita $orderby junto com o filtro de flag (InefficientFilter). */
export async function fetchFlaggedEmails(): Promise<GraphMessage[]> {
  const messages = await graphGetAllPages<GraphMessage>(FLAGGED_MAIL_QUERY);
  messages.sort((a, b) =>
    (b.receivedDateTime ?? '').localeCompare(a.receivedDateTime ?? ''),
  );
  ms365Logger.info('microsoft_graph', 'e-mails sinalizados buscados', {
    count: messages.length,
  });
  return messages;
}
