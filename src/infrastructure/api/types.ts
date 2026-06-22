// API response envelope types

export interface SingleResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  detail: string;
}

// Auth
export interface TokenResponse {
  token: string;
  token_type: string;
}

export interface UserMeResponse {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// Task
export interface ApiLabel {
  id: number;
  name: string;
  color: string | null;
}

export interface ApiChecklistItem {
  id: number;
  title: string;
  is_done: boolean;
  position: number;
}

export interface ApiReminder {
  id: number;
  remind_at: string;
  notified_at?: string | null;
}

export interface ApiReminderCreateRequest {
  // 'YYYY-MM-DDTHH:MM:SS'
  remind_at: string;
}

export interface ApiTaskList {
  id: number;
  name: string;
  color: string | null;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ApiRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  by_weekday: number[] | null; // 0=Dom .. 6=Sáb
  ends_at: string | null; // 'YYYY-MM-DD'
}

export interface ApiTaskSummary {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_time: string | null; // 'HH:MM'
  end_time: string | null; // 'HH:MM'
  recurrence: ApiRecurrence | null;
  is_favorite: boolean;
  completed_at: string | null;
  checklist_count: number;
  checklist_done: number;
  labels: ApiLabel[];
  // Vínculo com a fonte (e-mail sinalizado do Microsoft 365). Quando presente,
  // concluir/reabrir a tarefa espelha o flag do e-mail (ver módulo microsoft365).
  external_email_id: string | null;
  external_provider: string | null; // 'microsoft'
  created_at: string | null;
  updated_at: string | null;
}

// Espelhamento de e-mails sinalizados -> tarefas (POST /tasks/email-sync).
export interface ApiEmailSyncItem {
  external_id: string; // id da mensagem no Microsoft Graph
  title?: string | null;
  preview?: string | null;
  email_from?: string | null;
  received_at?: string | null;
  web_link?: string | null;
}

export interface ApiEmailSyncResult {
  created: number;
  list_id: number;
}

export interface ApiTaskDetail extends ApiTaskSummary {
  description: string | null;
  task_list: ApiTaskList | null;
  checklist_items: ApiChecklistItem[];
  comments_count: number;
  reminders: ApiReminder[];
}

export interface ApiTaskCreateRequest {
  title: string;
  task_list_id?: number;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  recurrence?: ApiRecurrence | null;
  parent_id?: number;
  is_favorite?: boolean;
}

export interface ApiTaskUpdateRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  recurrence?: ApiRecurrence | null;
  is_favorite?: boolean;
  task_list_id?: number;
}

// Reorder
export interface ApiTaskReorderItem {
  id: number;
  position: number;
}

// Task Lists
export type TaskListRole = 'admin' | 'member';

export interface ApiTaskListFull {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  position: number;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Compartilhamento — o backend passou a retornar estes campos.
  role?: TaskListRole;
  shared?: boolean;
}

export interface ApiTaskListMember {
  mobile_user_id: number;
  name: string;
  email: string;
  role: TaskListRole;
}

export interface ApiTaskListMemberCreateRequest {
  email: string;
}

// Resposta de POST /task-lists/{id}/members (não traz mobile_user_id)
export interface ApiTaskListMemberCreated {
  id: number;
  name: string;
  email: string;
  role: TaskListRole;
}

export interface ApiTaskListCreateRequest {
  name: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface ApiTaskListUpdateRequest {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
}

// Dashboard
export interface ApiDashboard {
  user_name: string;
  counters: {
    pending: number;
    completed: number;
    overdue: number;
    due_today: number;
  };
  urgent_tasks: ApiTaskSummary[];
}
