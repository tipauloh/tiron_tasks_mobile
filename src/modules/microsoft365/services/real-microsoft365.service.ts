// Microsoft 365 — implementação REAL do serviço de orquestração.
//
// Plugada na MESMA interface Microsoft365Service que o mock. A UI/hooks não
// mudam. Tokens vivem só no Secure Store; SQLite guarda apenas metadados não
// sensíveis (conta) e os itens sincronizados.

import {
  microsoftAccountRepository,
  microsoft365ItemRepository,
  deltaTokenRepository,
} from '../repositories';
import { mapGraphMessageToItem } from '../models/mappers';
import { fetchFlaggedEmails, me } from '../graph';
import { GraphError } from '../graph/client';
import {
  signIn,
  signOut,
  getValidAccessToken,
  getTokenExpiresAt,
  hasStoredSession,
  MicrosoftReauthRequiredError,
} from '../auth';
import type { MicrosoftAccount, Microsoft365Item, SyncResult } from '../types';
import { generateId } from '../../../utils/id';
import { taskApi } from '@/infrastructure/api/task-api';
import { ms365Logger } from '../utils/logger';
import type { ConnectionState, Microsoft365Service } from './microsoft365.service';

export class RealMicrosoft365Service implements Microsoft365Service {
  // Evita syncs concorrentes (sync automático + manual ao mesmo tempo).
  private syncing = false;

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

  /**
   * Conecta uma conta Microsoft: OAuth PKCE → tokens no Secure Store → GET /me
   * → persiste metadados → dispara sync inicial.
   */
  async connect(userId: string): Promise<MicrosoftAccount> {
    // 1) Fluxo OAuth interativo (abre navegador; troca code por tokens).
    const { expiresAt } = await signIn();

    // 2) Identidade do usuário via Graph.
    const profile = await me();
    const email = profile.mail ?? profile.userPrincipalName ?? '';

    // 3) Persiste metadados da conta (sem tokens).
    const now = Date.now();
    const existing = microsoftAccountRepository.getAccount();
    const account: MicrosoftAccount = {
      id: existing?.id ?? generateId(),
      userId,
      microsoftUserId: profile.id,
      email,
      displayName: profile.displayName ?? email,
      tokenExpiresAt: expiresAt,
      lastSyncAt: existing?.lastSyncAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    microsoftAccountRepository.saveAccount(account);
    ms365Logger.info('microsoft_auth', 'conta conectada', { accountId: account.id });

    // 4) Sync inicial — não falha o connect se o sync falhar (UI pode tentar de novo).
    try {
      await this.syncNow();
    } catch (err) {
      ms365Logger.warn('microsoft_sync', 'sync inicial falhou (conta segue conectada)', {
        error: err instanceof Error ? err.name : 'unknown',
      });
    }

    return microsoftAccountRepository.getAccount() ?? account;
  }

  /** Desconecta: limpa tokens e, opcionalmente, todos os dados locais. */
  async disconnect(removeData: boolean): Promise<void> {
    await signOut();
    microsoftAccountRepository.clearAccount();
    if (removeData) {
      microsoft365ItemRepository.clearItems();
      deltaTokenRepository.clearDeltaToken();
      ms365Logger.info('microsoft_auth', 'desconectado e dados removidos');
    } else {
      ms365Logger.info('microsoft_auth', 'desconectado, histórico local mantido');
    }
  }

  /**
   * Sincroniza: garante token válido → busca flagged emails + To Do (delta) →
   * mapeia → upsert → atualiza lastSyncAt. Erros não vazam conteúdo.
   */
  async syncNow(): Promise<SyncResult> {
    const account = microsoftAccountRepository.getAccount();
    if (!account) {
      ms365Logger.warn('microsoft_sync', 'sync sem conta conectada');
      return {
        status: 'error',
        emailCount: 0,
        taskCount: 0,
        syncedAt: Date.now(),
        error: 'Nenhuma conta conectada.',
      };
    }

    if (this.syncing) {
      ms365Logger.info('microsoft_sync', 'sync já em andamento, ignorando chamada concorrente');
      return {
        status: 'idle',
        emailCount: 0,
        taskCount: 0,
        syncedAt: Date.now(),
      };
    }

    this.syncing = true;
    const now = Date.now();
    ms365Logger.info('microsoft_sync', 'sync iniciado');

    try {
      // Garante que há token válido antes de bater no Graph (refresh se preciso).
      await getValidAccessToken();

      // Escopo desta versão: apenas e-mails sinalizados (Tarefas/To Do removido).
      const messages = await fetchFlaggedEmails();
      const emailItems: Microsoft365Item[] = messages.map((m) => mapGraphMessageToItem(m, now));
      microsoft365ItemRepository.upsertItems(emailItems);

      // Espelha os e-mails como tarefas no backend (lista "E-mail Sinalizados").
      // É idempotente; uma falha aqui não invalida o sync local (o cache de
      // e-mails já foi salvo e o próximo sync re-tenta).
      if (emailItems.length > 0) {
        try {
          await taskApi.emailSync(
            emailItems.map((it) => ({
              external_id: it.externalId,
              title: it.title,
              preview: it.emailPreview ?? it.summary,
              email_from: it.emailFrom,
              received_at: it.emailReceivedAt,
              web_link: it.webLink,
            })),
          );
        } catch (err) {
          ms365Logger.warn('microsoft_sync', 'espelhamento e-mail->tarefa falhou', {
            error: err instanceof Error ? err.name : 'unknown',
          });
        }
      }

      microsoftAccountRepository.setLastSyncAt(account.id, now);

      ms365Logger.info('microsoft_sync', 'sync finalizado', {
        emailCount: emailItems.length,
      });

      return {
        status: 'success',
        emailCount: emailItems.length,
        taskCount: 0,
        syncedAt: now,
      };
    } catch (err) {
      // Falha antes mesmo das chamadas (ex.: token/refresh).
      ms365Logger.error('microsoft_sync', 'falha no sync', {
        error: err instanceof Error ? err.name : 'unknown',
      });
      return {
        status: 'error',
        emailCount: 0,
        taskCount: 0,
        syncedAt: Date.now(),
        error: describeSyncError(err),
      };
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Indica se há uma sessão (conta + token) viável. Útil para o guard do sync
   * automático. Assíncrono porque consulta o Secure Store.
   */
  async hasViableSession(): Promise<boolean> {
    const account = microsoftAccountRepository.getAccount();
    if (!account) return false;
    return hasStoredSession();
  }

  /** Expiração do token atual (epoch ms) ou null. */
  async tokenExpiresAt(): Promise<number | null> {
    return getTokenExpiresAt();
  }
}

/** Mensagem amigável (e diagnóstica) para uma falha de sincronização. Não-sensível. */
function describeSyncError(reason: unknown): string {
  if (reason instanceof MicrosoftReauthRequiredError) {
    return 'sessão expirada — desconecte e reconecte a conta';
  }
  if (reason instanceof GraphError) {
    if (reason.status === 403) {
      return `sem permissão (HTTP 403${reason.graphCode ? ` ${reason.graphCode}` : ''}) — adicione os escopos no App Registration e reconecte`;
    }
    if (reason.status === 401) return 'sessão expirada (401) — reconecte';
    return `HTTP ${reason.status}${reason.graphCode ? ` ${reason.graphCode}` : ''}`;
  }
  return 'falha de rede ou inesperada';
}

export const realMicrosoft365Service = new RealMicrosoft365Service();
