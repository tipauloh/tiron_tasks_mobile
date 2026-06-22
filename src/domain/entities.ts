export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;       // ISO date 'YYYY-MM-DD'
  startTime?: string;     // 'HH:MM'
  endTime?: string;       // 'HH:MM'
  isRecurring?: boolean;  // tem recorrência configurada
  listId?: string;
  parentId?: string;      // null = task raiz
  isFavorite: boolean;
  position: number;
  completedAt?: string;   // ISO datetime
  createdAt: string;
  updatedAt: string;
  isEmailLinked?: boolean; // tarefa criada a partir de um e-mail (Microsoft 365)
}

export interface TaskList {
  id: string;
  name: string;
  color: string;          // hex #RRGGBB
  icon?: string;          // emoji ou nome de ícone
  isFavorite: boolean;
  position: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}
