// Microsoft 365 — modelos do módulo.
//
// Os tipos canônicos vivem em ../types. Este arquivo re-exporta os modelos de
// domínio usados pelos repositórios/serviços e expõe os mapeadores Graph→modelo.

export type {
  MicrosoftAccount,
  Microsoft365Item,
  Microsoft365SourceType,
  SyncStatus,
  SyncResult,
  GraphMessage,
  GraphTodoTask,
  GraphTodoList,
} from '../types';

export {
  mapGraphMessageToItem,
  mapGraphTodoTaskToItem,
} from './mappers';
