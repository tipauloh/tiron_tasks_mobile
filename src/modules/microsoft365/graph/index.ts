// Microsoft 365 — barrel da camada Graph.

export { graphGet, graphGetAllPages, graphGetDelta, graphPatch } from './client';
export { fetchFlaggedEmails, setEmailFlagComplete, setEmailFlagFlagged } from './mail';
export { fetchTodoListsAndTasks, me, type GraphMe } from './todo';
