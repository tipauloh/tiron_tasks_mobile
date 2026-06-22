// Microsoft 365 — busca de listas e tarefas do Microsoft To Do (com delta).
//
// READ-ONLY. To Do suporta delta nativamente: persistimos o @odata.deltaLink
// por lista (scope `todo:<listId>`) no delta-token-repository e, na próxima
// sync, usamos o deltaLink salvo para trazer só o que mudou.

import {
  GRAPH_BASE,
  TODO_LISTS_ENDPOINT,
  todoTasksDeltaEndpoint,
} from '../constants';
import { graphGetAllPages, graphGetDelta, GraphError } from './client';
import { deltaTokenRepository } from '../repositories';
import type { GraphTodoList, GraphTodoTask } from '../types';
import { ms365Logger } from '../utils/logger';

/** Identidade básica do usuário (GET /me). */
export interface GraphMe {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string | null;
}

/**
 * GET /me usando o access token DIRETAMENTE (raw fetch).
 *
 * MULTI-CONTA: chamado logo após o signIn, ANTES de conhecermos o accountId
 * (= profile.id) e ANTES de persistir os tokens — por isso NÃO passa por
 * getValidAccessToken(accountId). O bearer é injetado aqui e nunca logado.
 */
export async function me(accessToken: string): Promise<GraphMe> {
  const url = `${GRAPH_BASE}/me?$select=id,displayName,mail,userPrincipalName`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    let graphCode: string | null = null;
    try {
      const body = (await res.json()) as { error?: { code?: string } };
      graphCode = body?.error?.code ?? null;
    } catch {
      // corpo não-JSON; ignora
    }
    ms365Logger.error('microsoft_graph', 'erro no GET /me', {
      status: res.status,
      graphCode,
    });
    throw new GraphError(res.status, graphCode);
  }
  const data = (await res.json()) as {
    id: string;
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
  };
  return {
    id: data.id,
    displayName: data.displayName ?? null,
    mail: data.mail ?? null,
    userPrincipalName: data.userPrincipalName ?? null,
  };
}

/** Scope de delta token para uma lista do To Do. */
function deltaScope(listId: string): string {
  return `todo:${listId}`;
}

/** Lista as listas do To Do (paginadas). */
async function fetchTodoLists(accountId: string): Promise<GraphTodoList[]> {
  return graphGetAllPages<GraphTodoList>(TODO_LISTS_ENDPOINT, accountId);
}

/**
 * Busca tarefas de uma lista usando delta. Se houver deltaLink salvo, reusa
 * (incremental); caso contrário faz a carga inicial (full) e salva o deltaLink.
 */
async function fetchTasksForList(accountId: string, listId: string): Promise<GraphTodoTask[]> {
  const savedDelta = deltaTokenRepository.getDeltaToken(accountId, deltaScope(listId));
  const startUrl = savedDelta ?? todoTasksDeltaEndpoint(listId);

  const { items, deltaLink } = await graphGetDelta<GraphTodoTask>(startUrl, accountId);

  if (deltaLink) {
    deltaTokenRepository.setDeltaToken(accountId, deltaScope(listId), deltaLink);
  }
  return items;
}

/**
 * Busca todas as listas e suas tarefas (com delta por lista). Retorna a lista
 * achatada de tarefas. As tarefas removidas via delta vêm com `@removed` e são
 * filtradas (não exibimos itens deletados — read-only de itens ativos).
 */
export async function fetchTodoListsAndTasks(accountId: string): Promise<GraphTodoTask[]> {
  const lists = await fetchTodoLists(accountId);
  const allTasks: GraphTodoTask[] = [];

  for (const list of lists) {
    const tasks = await fetchTasksForList(accountId, list.id);
    // Filtra tarefas marcadas como removidas no payload delta.
    const active = tasks.filter((t) => !(t as GraphTodoTask & { '@removed'?: unknown })['@removed']);
    allTasks.push(...active);
  }

  ms365Logger.info('microsoft_graph', 'tarefas To Do buscadas', {
    listCount: lists.length,
    taskCount: allTasks.length,
  });
  return allTasks;
}
