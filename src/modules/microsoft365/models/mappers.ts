// Microsoft 365 — mapeadores Graph → Microsoft365Item (modelo unificado).
//
// READ-ONLY. Não envia nada para fora. O resumo (summary) é gerado localmente.

import type { GraphMessage, GraphTodoTask, Microsoft365Item } from '../types';
import { generateId } from '../../../utils/id';
import { summarizeEmail } from '../services/summary';

/** Mapeia o importance do To Do (low|normal|high) para nosso vocabulário de prioridade. */
function mapImportance(importance?: string): string | null {
  switch (importance) {
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    case 'normal':
      return 'normal';
    default:
      return null;
  }
}

/**
 * Converte um GraphMessage (e-mail sinalizado do Outlook) em Microsoft365Item.
 * sourceType = 'EMAIL'. O título é o assunto; o resumo é gerado localmente a
 * partir do bodyPreview + subject (nunca enviado para fora).
 */
export function mapGraphMessageToItem(
  message: GraphMessage,
  now: number = Date.now(),
): Microsoft365Item {
  const subject = message.subject ?? '(sem assunto)';
  const preview = message.bodyPreview ?? '';
  const fromAddress =
    message.from?.emailAddress?.address ?? message.from?.emailAddress?.name ?? null;

  return {
    id: generateId(),
    externalId: message.id,
    sourceType: 'EMAIL',
    title: subject,
    summary: summarizeEmail(preview, subject),
    status: message.isRead ? 'read' : 'unread',
    priority: null,
    dueDate: null,
    webLink: message.webLink ?? null,
    lastSync: now,
    createdAt: now,
    updatedAt: now,
    emailFrom: fromAddress,
    emailReceivedAt: message.receivedDateTime ?? null,
    emailIsRead: message.isRead ?? null,
    emailFlagStatus: message.flag?.flagStatus ?? null,
    emailPreview: preview || null,
  };
}

/**
 * Converte um GraphTodoTask (tarefa do Microsoft To Do) em Microsoft365Item.
 * sourceType = 'TODO_TASK'.
 */
export function mapGraphTodoTaskToItem(
  task: GraphTodoTask,
  now: number = Date.now(),
): Microsoft365Item {
  return {
    id: generateId(),
    externalId: task.id,
    sourceType: 'TODO_TASK',
    title: task.title ?? '(sem título)',
    summary: null,
    status: task.status ?? null,
    priority: mapImportance(task.importance),
    dueDate: task.dueDateTime?.dateTime ?? null,
    webLink: null,
    lastSync: now,
    createdAt: now,
    updatedAt: now,
    emailFrom: null,
    emailReceivedAt: null,
    emailIsRead: null,
    emailFlagStatus: null,
    emailPreview: null,
  };
}
