// Tipos da API de Metas (Goals / OKRs). Espelham o backend em /api/v1/goals.
// O backend computa todo progress/score — o app apenas exibe + formata.

export type ApiKpiType =
  | 'number'
  | 'percent'
  | 'currency'
  | 'quantity'
  | 'time'
  | 'weight'
  | 'custom';

export interface ApiKeyResultSummary {
  id: number;
  title: string;
  kpi_type: ApiKpiType;
  unit: string | null;
  start_value: number;
  current_value: number;
  target_value: number;
  weight: number;
  is_highlight: boolean;
  progress: number; // 0..1
  // Em destaques do dashboard, o backend pode anexar o título da meta-pai.
  goal_title?: string | null;
}

export interface ApiGoalSummary {
  id: number;
  title: string;
  category: string;
  status: string;
  end_date: string | null; // 'YYYY-MM-DD'
  is_primary: boolean;
  weight: number;
  progress: number; // 0..1
  key_results: ApiKeyResultSummary[];
}

export interface ApiGoalDetail extends ApiGoalSummary {
  // Detalhe pode trazer campos extras no futuro; herda o resumo por ora.
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiGoalsDashboard {
  score: number; // 0..1
  status_label: string;
  trend: 'up' | 'stable' | 'down';
  primary_goal: ApiGoalSummary | null;
  goals: ApiGoalSummary[]; // top 3
  kpis: ApiKeyResultSummary[]; // até 4 destaques
}

// ─── Requests ────────────────────────────────────────────────────────────────

export interface ApiKeyResultCreateRequest {
  title: string;
  kpi_type: ApiKpiType;
  unit?: string | null;
  start_value: number;
  current_value?: number;
  target_value: number;
  weight?: number;
  is_highlight?: boolean;
}

export interface ApiKeyResultUpdateRequest {
  title?: string;
  kpi_type?: ApiKpiType;
  unit?: string | null;
  start_value?: number;
  current_value?: number;
  target_value?: number;
  weight?: number;
  is_highlight?: boolean;
}

export interface ApiGoalCreateRequest {
  title: string;
  category: string;
  end_date?: string | null; // 'YYYY-MM-DD'
  weight?: number;
  is_primary?: boolean;
  key_results?: ApiKeyResultCreateRequest[];
}

export interface ApiGoalUpdateRequest {
  title?: string;
  category?: string;
  status?: string;
  end_date?: string | null;
  weight?: number;
  is_primary?: boolean;
}
