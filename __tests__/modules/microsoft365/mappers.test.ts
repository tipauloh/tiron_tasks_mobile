/**
 * Testes dos mapeadores Graph → Microsoft365Item.
 */

// Mocka utils/id (que usa expo-modules-core/uuid) sem tocar em expo-modules-core,
// evitando a cadeia winter/fetch do jest-expo. Contador interno à factory.
jest.mock('../../../src/utils/id', () => {
  let idCounter = 0;
  return {
    generateId: jest.fn(() => `id-${++idCounter}`),
    nowISO: jest.fn(() => '2026-01-01T00:00:00.000Z'),
    todayDate: jest.fn(() => '2026-01-01'),
  };
});

import {
  mapGraphMessageToItem,
  mapGraphTodoTaskToItem,
} from '../../../src/modules/microsoft365/models/mappers';
import type {
  GraphMessage,
  GraphTodoTask,
} from '../../../src/modules/microsoft365/types';

const NOW = 1_700_000_000_000;

describe('mapGraphMessageToItem', () => {
  const message: GraphMessage = {
    id: 'AAMk-123',
    subject: 'Proposta comercial',
    bodyPreview:
      'Segue a proposta atualizada com novos valores e prazos. Revise os itens destacados ' +
      'e responda até sexta para fecharmos o contrato com o cliente.',
    webLink: 'https://outlook.office.com/mail/AAMk-123',
    isRead: false,
    receivedDateTime: '2026-06-20T14:30:00Z',
    from: { emailAddress: { name: 'Ana', address: 'ana@example.com' } },
    flag: { flagStatus: 'flagged' },
  };

  it('mapeia campos básicos com sourceType EMAIL', () => {
    const item = mapGraphMessageToItem(message, NOW);
    expect(item.sourceType).toBe('EMAIL');
    expect(item.externalId).toBe('AAMk-123');
    expect(item.title).toBe('Proposta comercial');
    expect(item.webLink).toBe('https://outlook.office.com/mail/AAMk-123');
    expect(item.lastSync).toBe(NOW);
  });

  it('mapeia metadados de e-mail (from, isRead, flag, preview, receivedAt)', () => {
    const item = mapGraphMessageToItem(message, NOW);
    expect(item.emailFrom).toBe('ana@example.com');
    expect(item.emailIsRead).toBe(false);
    expect(item.emailFlagStatus).toBe('flagged');
    expect(item.emailReceivedAt).toBe('2026-06-20T14:30:00Z');
    expect(item.emailPreview).toContain('proposta atualizada');
    expect(item.status).toBe('unread');
  });

  it('gera resumo dentro da faixa 100–300', () => {
    const item = mapGraphMessageToItem(message, NOW);
    expect(item.summary).not.toBeNull();
    expect(item.summary!.length).toBeGreaterThanOrEqual(100);
    expect(item.summary!.length).toBeLessThanOrEqual(300);
  });

  it('trata assunto nulo com fallback', () => {
    const item = mapGraphMessageToItem({ ...message, subject: null }, NOW);
    expect(item.title).toBe('(sem assunto)');
  });

  it('define status read quando isRead=true', () => {
    const item = mapGraphMessageToItem({ ...message, isRead: true }, NOW);
    expect(item.status).toBe('read');
    expect(item.emailIsRead).toBe(true);
  });
});

describe('mapGraphTodoTaskToItem', () => {
  const task: GraphTodoTask = {
    id: 'task-1',
    title: 'Enviar relatório',
    status: 'notStarted',
    importance: 'high',
    dueDateTime: { dateTime: '2026-06-25T00:00:00.0000000', timeZone: 'UTC' },
    lastModifiedDateTime: '2026-06-20T08:00:00Z',
  };

  it('mapeia campos com sourceType TODO_TASK', () => {
    const item = mapGraphTodoTaskToItem(task, NOW);
    expect(item.sourceType).toBe('TODO_TASK');
    expect(item.externalId).toBe('task-1');
    expect(item.title).toBe('Enviar relatório');
    expect(item.status).toBe('notStarted');
    expect(item.priority).toBe('high');
    expect(item.dueDate).toBe('2026-06-25T00:00:00.0000000');
  });

  it('não preenche campos específicos de e-mail', () => {
    const item = mapGraphTodoTaskToItem(task, NOW);
    expect(item.emailFrom).toBeNull();
    expect(item.emailPreview).toBeNull();
    expect(item.summary).toBeNull();
  });

  it('mapeia importance ausente para prioridade null', () => {
    const item = mapGraphTodoTaskToItem({ ...task, importance: undefined }, NOW);
    expect(item.priority).toBeNull();
  });

  it('trata dueDateTime null', () => {
    const item = mapGraphTodoTaskToItem({ ...task, dueDateTime: null }, NOW);
    expect(item.dueDate).toBeNull();
  });
});
