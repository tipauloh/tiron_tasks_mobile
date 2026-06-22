// Microsoft 365 — tipos do módulo (READ-ONLY).

export type Microsoft365SourceType = 'EMAIL' | 'TODO_TASK';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/** Conta Microsoft conectada (1 por usuário do app). Tokens NÃO ficam aqui — só no Secure Store. */
export interface MicrosoftAccount {
  id: string;
  userId: string; // id do usuário do app (mobile_user)
  microsoftUserId: string;
  email: string;
  displayName: string;
  tokenExpiresAt: number; // epoch ms
  lastSyncAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Modelo unificado para exibição. */
export interface Microsoft365Item {
  id: string;
  externalId: string;
  sourceType: Microsoft365SourceType;
  title: string;
  summary: string | null; // resumo gerado localmente (100–300 chars)
  status: string | null; // ex.: 'notStarted' | 'completed' (To Do); 'read'|'unread' (email)
  priority: string | null;
  dueDate: string | null; // ISO
  webLink: string | null;
  lastSync: number;
  createdAt: number;
  updatedAt: number;
  // Campos auxiliares específicos de e-mail (null para tarefas):
  emailFrom?: string | null;
  emailReceivedAt?: string | null;
  emailIsRead?: boolean | null;
  emailFlagStatus?: string | null;
  emailPreview?: string | null;
}

// ── Shapes mínimos do Microsoft Graph (apenas o que consumimos) ──

export interface GraphEmailAddress {
  name?: string;
  address?: string;
}

export interface GraphMessage {
  id: string;
  subject: string | null;
  bodyPreview: string | null;
  webLink: string | null;
  isRead: boolean;
  receivedDateTime: string;
  from?: { emailAddress?: GraphEmailAddress };
  flag?: { flagStatus?: 'notFlagged' | 'complete' | 'flagged' };
}

export interface GraphTodoList {
  id: string;
  displayName: string;
  wellknownListName?: string;
}

export interface GraphTodoTask {
  id: string;
  title: string;
  status: string; // notStarted | inProgress | completed | ...
  importance?: string; // low | normal | high
  dueDateTime?: { dateTime: string; timeZone: string } | null;
  lastModifiedDateTime?: string;
}

export interface GraphCollection<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

/** Resultado resumido de uma sincronização (para o card de status). */
export interface SyncResult {
  status: SyncStatus;
  emailCount: number;
  taskCount: number;
  syncedAt: number;
  error?: string;
}
