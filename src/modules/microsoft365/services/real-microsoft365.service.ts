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
  persistTokensForAccount,
  readStoredTokens,
  MicrosoftReauthRequiredError,
  type StoredTokens,
} from '../auth';
import type { MicrosoftAccount, Microsoft365Item, SyncResult } from '../types';
import { taskApi } from '@/infrastructure/api/task-api';
import { remoteAccountApi } from '../repositories/remote-account-api';
import { ms365Logger } from '../utils/logger';
import type { ConnectionState, Microsoft365Service } from './microsoft365.service';

export class RealMicrosoft365Service implements Microsoft365Service {
  // Evita syncs concorrentes (sync automático + manual ao mesmo tempo).
  private syncing = false;

  getConnectionState(): ConnectionState {
    const accounts = microsoftAccountRepository.getAccounts();
    const lastSyncAt = accounts.reduce<number | null>(
      (max, a) => (a.lastSyncAt != null && (max == null || a.lastSyncAt > max) ? a.lastSyncAt : max),
      null,
    );
    return {
      isConnected: accounts.length > 0,
      accounts,
      emailCount: microsoft365ItemRepository.countItems({ sourceType: 'EMAIL' }),
      taskCount: 0,
      lastSyncAt,
    };
  }

  /**
   * Conecta (ou re-conecta) uma conta Microsoft: OAuth PKCE → GET /me (que define
   * o accountId = profile.id) → persiste tokens POR CONTA no Secure Store →
   * salva/atualiza a linha da conta (sem remover as demais) → sync inicial.
   */
  async connect(userId: string): Promise<MicrosoftAccount> {
    // 1) Fluxo OAuth interativo (abre navegador; troca code por tokens) — SEM persistir.
    const tok = await signIn();

    // 2) Identidade do usuário via Graph (usa o access token direto). Define o accountId.
    const profile = await me(tok.accessToken);
    const accountId = profile.id;
    const email = profile.mail ?? profile.userPrincipalName ?? '';

    // 3) Agora que sabemos o accountId, persiste os tokens dessa conta.
    await persistTokensForAccount(accountId, tok);

    // 4) Upsert da conta (não remove outras contas).
    const now = Date.now();
    const existing = microsoftAccountRepository.getAccountById(accountId);
    const account: MicrosoftAccount = {
      id: accountId,
      userId,
      microsoftUserId: profile.id,
      email,
      displayName: profile.displayName ?? email,
      tokenExpiresAt: tok.expiresAt,
      lastSyncAt: existing?.lastSyncAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    microsoftAccountRepository.saveAccount(account);
    // Sincroniza a conta + tokens (cifrados) com o backend para que outros
    // dispositivos da mesma conta Tiron a recebam.
    await this.pushAccountToRemote(account, tok);
    ms365Logger.info('microsoft_auth', 'conta conectada', { accountId: account.id });

    // 5) Sync inicial só dessa conta — não falha o connect se o sync falhar.
    try {
      await this.syncNow(accountId);
    } catch (err) {
      ms365Logger.warn('microsoft_sync', 'sync inicial falhou (conta segue conectada)', {
        error: err instanceof Error ? err.name : 'unknown',
      });
    }

    return microsoftAccountRepository.getAccountById(accountId) ?? account;
  }

  /** Desconecta UMA conta: limpa tokens dela e, opcionalmente, seus dados locais. */
  async disconnect(accountId: string, removeData: boolean): Promise<void> {
    await signOut(accountId);
    microsoftAccountRepository.clearAccount(accountId);
    // Remove do backend para não reaparecer em outros dispositivos.
    try {
      await remoteAccountApi.remove(accountId);
    } catch {
      // best-effort
    }
    if (removeData) {
      microsoft365ItemRepository.clearItems({ accountId });
      deltaTokenRepository.clearDeltaToken(accountId);
      ms365Logger.info('microsoft_auth', 'desconectado e dados removidos', { accountId });
    } else {
      ms365Logger.info('microsoft_auth', 'desconectado, histórico local mantido', { accountId });
    }
  }

  /**
   * Sincroniza. Se `accountId` for informado, sincroniza apenas essa conta;
   * senão, faz loop em TODAS as contas conectadas. Por conta: garante token
   * válido → busca flagged emails → mapeia (com accountId) → upsert → emailSync
   * (com account_id + reconcile) → atualiza lastSyncAt. Erros não vazam conteúdo.
   */
  async syncNow(accountId?: string): Promise<SyncResult> {
    const allAccounts = microsoftAccountRepository.getAccounts();
    const targets = accountId
      ? allAccounts.filter((a) => a.id === accountId)
      : allAccounts;

    if (targets.length === 0) {
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
    ms365Logger.info('microsoft_sync', 'sync iniciado', { accounts: targets.length });

    let emailTotal = 0;
    let lastError: unknown = null;
    const syncedAt = Date.now();

    try {
      for (const account of targets) {
        const now = Date.now();
        try {
          // Garante token válido antes de bater no Graph (refresh se preciso).
          const prevExp = await getTokenExpiresAt(account.id);
          await getValidAccessToken(account.id);
          const fresh = await readStoredTokens(account.id);
          if (fresh && fresh.expiresAt !== prevExp) {
            // Token foi renovado → propaga para o backend (outros dispositivos).
            await this.pushAccountToRemote(account, fresh);
          }

          // Escopo desta versão: apenas e-mails sinalizados.
          const messages = await fetchFlaggedEmails(account.id);
          const emailItems: Microsoft365Item[] = messages.map((m) =>
            mapGraphMessageToItem(m, account.id, now),
          );
          microsoft365ItemRepository.upsertItems(emailItems);
          // Cache reflete só os e-mails AINDA sinalizados: remove os que saíram
          // da lista de flagged (desmarcados/concluídos) — o contador conta só os abertos.
          microsoft365ItemRepository.keepOnlyEmails(
            account.id,
            emailItems.map((it) => it.externalId),
          );

          // Espelha os e-mails como tarefas no backend (lista "E-mail Sinalizados").
          // Chamado SEMPRE (mesmo vazio) por conta, com reconcile=true para que o
          // backend conclua tarefas de e-mails que deixaram de estar sinalizados.
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
              { accountId: account.id, reconcile: true },
            );
          } catch (err) {
            ms365Logger.warn('microsoft_sync', 'espelhamento e-mail->tarefa falhou', {
              error: err instanceof Error ? err.name : 'unknown',
            });
          }

          microsoftAccountRepository.setLastSyncAt(account.id, now);
          emailTotal += emailItems.length;
        } catch (err) {
          // Falha de uma conta não aborta as demais.
          lastError = err;
          ms365Logger.error('microsoft_sync', 'falha no sync da conta', {
            accountId: account.id,
            error: err instanceof Error ? err.name : 'unknown',
          });
        }
      }

      if (lastError && emailTotal === 0) {
        return {
          status: 'error',
          emailCount: 0,
          taskCount: 0,
          syncedAt: Date.now(),
          error: describeSyncError(lastError),
        };
      }

      ms365Logger.info('microsoft_sync', 'sync finalizado', { emailCount: emailTotal });
      return {
        status: 'success',
        emailCount: emailTotal,
        taskCount: 0,
        syncedAt,
      };
    } finally {
      this.syncing = false;
    }
  }

  /** Envia (upsert) uma conta + seus tokens para o backend. Best-effort. */
  private async pushAccountToRemote(
    account: MicrosoftAccount,
    tokens: StoredTokens | null,
  ): Promise<void> {
    try {
      await remoteAccountApi.upsert(account.id, {
        account_id: account.id,
        email: account.email,
        display_name: account.displayName,
        access_token: tokens?.accessToken ?? null,
        refresh_token: tokens?.refreshToken ?? null,
        token_expires_at: tokens?.expiresAt ?? account.tokenExpiresAt ?? null,
      });
    } catch (err) {
      ms365Logger.warn('microsoft_auth', 'falha ao sincronizar conta com o backend', {
        accountId: account.id,
        error: err instanceof Error ? err.name : 'unknown',
      });
    }
  }

  /**
   * Restaura, neste dispositivo, as contas Microsoft sincronizadas no backend
   * (conectadas em outro aparelho). Para contas ainda inexistentes localmente,
   * grava os tokens no Secure Store; para as já existentes, só atualiza os
   * metadados (os tokens locais podem estar mais frescos). Best-effort.
   */
  async restoreFromRemote(userId: string): Promise<number> {
    let remote;
    try {
      const res = await remoteAccountApi.list();
      remote = res.data;
    } catch {
      return 0; // sem rede / não autenticado → silencioso
    }
    const now = Date.now();
    let restored = 0;
    for (const r of remote) {
      const existing = microsoftAccountRepository.getAccountById(r.account_id);
      if (!existing && r.access_token) {
        await persistTokensForAccount(r.account_id, {
          accessToken: r.access_token,
          refreshToken: r.refresh_token ?? null,
          expiresAt: r.token_expires_at ?? 0,
        });
        restored += 1;
      }
      microsoftAccountRepository.saveAccount({
        id: r.account_id,
        userId,
        microsoftUserId: r.account_id,
        email: r.email ?? '',
        displayName: r.display_name ?? r.email ?? '',
        tokenExpiresAt: r.token_expires_at ?? existing?.tokenExpiresAt ?? 0,
        lastSyncAt: existing?.lastSyncAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    }
    if (restored > 0) {
      ms365Logger.info('microsoft_auth', 'contas restauradas do backend', { restored });
    }
    return restored;
  }

  /**
   * Indica se há ALGUMA sessão (conta + token) viável. Útil para o guard do sync
   * automático. Assíncrono porque consulta o Secure Store.
   */
  async hasViableSession(): Promise<boolean> {
    const accounts = microsoftAccountRepository.getAccounts();
    for (const account of accounts) {
      if (await hasStoredSession(account.id)) return true;
    }
    return false;
  }

  /** Expiração do token de uma conta (epoch ms) ou null. */
  async tokenExpiresAt(accountId: string): Promise<number | null> {
    return getTokenExpiresAt(accountId);
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
