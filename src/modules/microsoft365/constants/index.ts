// Microsoft 365 — constantes do módulo (sem segredos; o Client ID vem de app config).
// READ-ONLY: somente escopos de leitura. Ver docs/integrations/microsoft365/.

/** Tenant: 'common' = contas pessoais + corporativas. (ADR-003) */
export const MS_TENANT = 'common';

export const MS_AUTHORITY = `https://login.microsoftonline.com/${MS_TENANT}`;
export const MS_AUTHORIZE_ENDPOINT = `${MS_AUTHORITY}/oauth2/v2.0/authorize`;
export const MS_TOKEN_ENDPOINT = `${MS_AUTHORITY}/oauth2/v2.0/token`;

export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/** Escopos delegados — SOMENTE LEITURA (princípio do menor privilégio). */
export const MS_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Tasks.Read',
] as const;

/** Caminho do redirect (custom scheme do app: tirontasks://auth/microsoft). */
export const MS_REDIRECT_PATH = 'auth/microsoft';

/** Campos mínimos de e-mail (reduz payload; sem baixar corpo completo). */
export const MAIL_SELECT_FIELDS = 'id,subject,from,receivedDateTime,bodyPreview,webLink,isRead,flag';

/** E-mails sinalizados (não-concluídos): filtro oficial Graph. */
export const FLAGGED_MAIL_QUERY =
  `/me/messages?$filter=flag/flagStatus eq 'flagged'&$select=${MAIL_SELECT_FIELDS}&$top=50&$orderby=receivedDateTime desc`;

/** Microsoft To Do. */
export const TODO_LISTS_ENDPOINT = '/me/todo/lists';
export const todoTasksEndpoint = (listId: string) => `/me/todo/lists/${listId}/tasks`;
export const todoTasksDeltaEndpoint = (listId: string) => `/me/todo/lists/${listId}/tasks/delta`;

/** Sincronização automática a cada 30 min (guard de bateria). */
export const SYNC_INTERVAL_MS = 30 * 60 * 1000;

/** Nome/flag da lista de sistema criada ao conectar. */
export const MS365_SYSTEM_LIST_NAME = 'Microsoft365';

/** Chaves do Secure Store (tokens nunca vão para SQLite/logs). */
export const SECURE_KEYS = {
  accessToken: 'ms365_access_token',
  refreshToken: 'ms365_refresh_token',
  account: 'ms365_account_meta', // metadados não-sensíveis podem ir ao SQLite; tokens só aqui
} as const;
