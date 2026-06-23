import { Colors } from '@/constants/colors';

// Cor de progresso por limiar (compartilhada por ProgressBar, CircularProgress,
// ScoreCard, GoalCard...):  >=0.7 success · >=0.4 warning · senão danger.
export function progressColor(progress: number): string {
  const p = progress || 0;
  if (p >= 0.7) return Colors.success;
  if (p >= 0.4) return Colors.warning;
  return Colors.danger;
}
