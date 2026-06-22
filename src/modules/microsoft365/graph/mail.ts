// Microsoft 365 — busca de e-mails sinalizados (flagged) via Graph.
//
// READ-ONLY. delta de mensagens é por pasta e não combina com o filtro de
// flag, então usamos $filter=flag/flagStatus eq 'flagged' + paginação
// nextLink (ADR-002). Nenhum corpo/subject é logado.

import { FLAGGED_MAIL_QUERY } from '../constants';
import { graphGetAllPages } from './client';
import type { GraphMessage } from '../types';
import { ms365Logger } from '../utils/logger';

/** Busca todos os e-mails sinalizados (paginados). */
export async function fetchFlaggedEmails(): Promise<GraphMessage[]> {
  const messages = await graphGetAllPages<GraphMessage>(FLAGGED_MAIL_QUERY);
  ms365Logger.info('microsoft_graph', 'e-mails sinalizados buscados', {
    count: messages.length,
  });
  return messages;
}
