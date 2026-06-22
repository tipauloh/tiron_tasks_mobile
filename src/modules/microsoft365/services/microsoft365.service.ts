// Microsoft 365 — serviço de orquestração (connect / disconnect / syncNow).
//
// ⚠️ ESTA É A IMPLEMENTAÇÃO **MOCK**. Não há auth real nem chamadas ao Graph.
// A camada de auth (expo-auth-session + PKCE) e o cliente Graph serão plugados
// depois, implementando a interface `Microsoft365Service` abaixo. Os pontos de
// extensão estão marcados com TODO(auth)/TODO(graph).
//
// READ-ONLY. Tokens NUNCA passam por aqui para o SQLite/logs.

import {
  microsoftAccountRepository,
  microsoft365ItemRepository,
  deltaTokenRepository,
} from '../repositories';
import { mapGraphMessageToItem, mapGraphTodoTaskToItem } from '../models/mappers';
import type {
  MicrosoftAccount,
  Microsoft365Item,
  SyncResult,
  GraphMessage,
  GraphTodoTask,
} from '../types';
import { generateId } from '../../../utils/id';
import { ms365Logger } from '../utils/logger';

// ────────────────────────────────────────────────────────────────────────────
// Estado de conexão exposto à UI.
// ────────────────────────────────────────────────────────────────────────────

export interface ConnectionState {
  isConnected: boolean;
  account: MicrosoftAccount | null;
  emailCount: number;
  taskCount: number;
  lastSyncAt: number | null;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACE que a auth/graph reais precisarão implementar.
// A UI/hooks dependem SÓ desta interface — trocar mock por real é transparente.
// ────────────────────────────────────────────────────────────────────────────

export interface Microsoft365Service {
  /** Estado atual da conexão (lê do cache local, não faz rede). */
  getConnectionState(): ConnectionState;

  /**
   * Conecta uma conta Microsoft.
   * REAL: dispara OAuth PKCE (expo-auth-session), troca code→tokens, guarda
   * tokens no Secure Store, chama GET /me e persiste os metadados da conta.
   * MOCK: cria uma conta fake e a persiste.
   */
  connect(userId: string): Promise<MicrosoftAccount>;

  /**
   * Desconecta a conta.
   * REAL: revoga/limpa tokens do Secure Store.
   * @param removeData se true, apaga itens e delta tokens locais; se false,
   *        mantém o histórico local mas remove a conta/tokens.
   */
  disconnect(removeData: boolean): Promise<void>;

  /**
   * Sincroniza agora.
   * REAL: garante access token válido (refresh se preciso), busca e-mails
   * sinalizados (filtro Graph) + To Do (delta), mapeia e faz upsert.
   * MOCK: popula itens fake via mappers e atualiza lastSync.
   */
  syncNow(): Promise<SyncResult>;
}

// ────────────────────────────────────────────────────────────────────────────
// IMPLEMENTAÇÃO MOCK
// ────────────────────────────────────────────────────────────────────────────

/** Dados fake do Graph para o sync mockado (formato idêntico ao real). */
const MOCK_GRAPH_MESSAGES: GraphMessage[] = [
  {
    id: 'mock-msg-1',
    subject: 'Revisar proposta comercial do cliente Tiron',
    bodyPreview:
      'Olá, segue em anexo a proposta atualizada com os novos valores e prazos. ' +
      'Preciso da sua revisão até sexta-feira para fecharmos o contrato com o cliente.',
    webLink: 'https://outlook.office.com/mail/mock-1',
    isRead: false,
    receivedDateTime: '2026-06-20T14:30:00Z',
    from: { emailAddress: { name: 'Ana Souza', address: 'ana.souza@example.com' } },
    flag: { flagStatus: 'flagged' },
  },
  {
    id: 'mock-msg-2',
    subject: 'Agenda da reunião de planejamento Q3',
    bodyPreview:
      'Confirmando a reunião de planejamento do próximo trimestre na quinta-feira às 10h. ' +
      'Por favor, tragam os relatórios de progresso das suas frentes.',
    webLink: 'https://outlook.office.com/mail/mock-2',
    isRead: true,
    receivedDateTime: '2026-06-19T09:15:00Z',
    from: { emailAddress: { name: 'Carlos Lima', address: 'carlos.lima@example.com' } },
    flag: { flagStatus: 'flagged' },
  },
];

const MOCK_GRAPH_TASKS: GraphTodoTask[] = [
  {
    id: 'mock-task-1',
    title: 'Enviar relatório mensal de vendas',
    status: 'notStarted',
    importance: 'high',
    dueDateTime: { dateTime: '2026-06-25T00:00:00.0000000', timeZone: 'UTC' },
    lastModifiedDateTime: '2026-06-20T08:00:00Z',
  },
  {
    id: 'mock-task-2',
    title: 'Preparar apresentação para o board',
    status: 'inProgress',
    importance: 'normal',
    dueDateTime: { dateTime: '2026-06-28T00:00:00.0000000', timeZone: 'UTC' },
    lastModifiedDateTime: '2026-06-21T11:00:00Z',
  },
  {
    id: 'mock-task-3',
    title: 'Aprovar orçamento de marketing',
    status: 'completed',
    importance: 'low',
    dueDateTime: null,
    lastModifiedDateTime: '2026-06-18T16:00:00Z',
  },
];

export class MockMicrosoft365Service implements Microsoft365Service {
  getConnectionState(): ConnectionState {
    const account = microsoftAccountRepository.getAccount();
    return {
      isConnected: account != null,
      account,
      emailCount: microsoft365ItemRepository.countItems('EMAIL'),
      taskCount: microsoft365ItemRepository.countItems('TODO_TASK'),
      lastSyncAt: account?.lastSyncAt ?? null,
    };
  }

  async connect(userId: string): Promise<MicrosoftAccount> {
    // TODO(auth): substituir por OAuth PKCE real (expo-auth-session):
    //   1. authRequest.promptAsync() → code
    //   2. trocar code+verifier por tokens em MS_TOKEN_ENDPOINT
    //   3. salvar tokens no Secure Store (SECURE_KEYS)
    //   4. GET /me (User.Read) para obter id/email/displayName reais
    const now = Date.now();
    const account: MicrosoftAccount = {
      id: generateId(),
      userId,
      microsoftUserId: 'mock-ms-user-id',
      email: 'usuario.mock@outlook.com',
      displayName: 'Usuário Mock',
      tokenExpiresAt: now + 60 * 60 * 1000, // +1h (mock)
      lastSyncAt: null,
      createdAt: now,
      updatedAt: now,
    };
    microsoftAccountRepository.saveAccount(account);
    ms365Logger.info('microsoft_auth', 'conta conectada (mock)', { accountId: account.id });
    return account;
  }

  async disconnect(removeData: boolean): Promise<void> {
    // TODO(auth): limpar tokens do Secure Store (access + refresh).
    microsoftAccountRepository.clearAccount();
    if (removeData) {
      microsoft365ItemRepository.clearItems();
      deltaTokenRepository.clearDeltaToken();
      ms365Logger.info('microsoft_auth', 'desconectado e dados removidos (mock)');
    } else {
      ms365Logger.info('microsoft_auth', 'desconectado, histórico local mantido (mock)');
    }
  }

  async syncNow(): Promise<SyncResult> {
    const account = microsoftAccountRepository.getAccount();
    if (!account) {
      const result: SyncResult = {
        status: 'error',
        emailCount: 0,
        taskCount: 0,
        syncedAt: Date.now(),
        error: 'Nenhuma conta conectada.',
      };
      ms365Logger.warn('microsoft_sync', 'sync sem conta conectada (mock)');
      return result;
    }

    const now = Date.now();
    ms365Logger.info('microsoft_sync', 'sync iniciado (mock)');

    // TODO(graph): substituir os mocks por chamadas reais ao Microsoft Graph:
    //   - E-mails: GET FLAGGED_MAIL_QUERY (paginação @odata.nextLink)
    //   - To Do:   GET TODO_LISTS_ENDPOINT + delta por lista (deltaTokenRepository)
    const emailItems: Microsoft365Item[] = MOCK_GRAPH_MESSAGES.map((m) =>
      mapGraphMessageToItem(m, now),
    );
    const taskItems: Microsoft365Item[] = MOCK_GRAPH_TASKS.map((t) =>
      mapGraphTodoTaskToItem(t, now),
    );

    microsoft365ItemRepository.upsertItems([...emailItems, ...taskItems]);
    microsoftAccountRepository.setLastSyncAt(account.id, now);

    const result: SyncResult = {
      status: 'success',
      emailCount: emailItems.length,
      taskCount: taskItems.length,
      syncedAt: now,
    };
    ms365Logger.info('microsoft_sync', 'sync concluído (mock)', {
      emailCount: result.emailCount,
      taskCount: result.taskCount,
    });
    return result;
  }
}

/** Instância padrão usada pelos hooks. Trocar por implementação real depois. */
export const microsoft365Service: Microsoft365Service = new MockMicrosoft365Service();
