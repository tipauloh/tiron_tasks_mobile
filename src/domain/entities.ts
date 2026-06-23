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

// ─── Metas (Goals / OKRs) ────────────────────────────────────────────────────

// Tipo de KPI de um Resultado-Chave. Define como o valor é formatado na UI.
export type KpiType = 'number' | 'percent' | 'currency' | 'quantity' | 'time' | 'weight' | 'custom';

export type GoalCategory =
  | 'Saúde'
  | 'Trabalho'
  | 'Estudos'
  | 'Finanças'
  | 'Família'
  | 'Pessoal'
  | 'Outro';

export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'completed' | 'archived';

// Tendência geral do painel de metas (calculada pelo backend).
export type GoalTrend = 'up' | 'stable' | 'down';

export interface KeyResult {
  id: string;
  title: string;
  kpiType: KpiType;
  unit?: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  weight: number;
  isHighlight: boolean;
  progress: number; // 0..1, calculado pelo backend
}

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  endDate?: string; // 'YYYY-MM-DD'
  isPrimary: boolean;
  weight: number;
  progress: number; // 0..1, calculado pelo backend
  keyResults: KeyResult[];
}
