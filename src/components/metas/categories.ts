import type { GoalCategory } from '@/domain/entities';

// Categorias de metas com emoji + cor — usadas no picker de criação e nos cards.
export const GOAL_CATEGORIES: Array<{ value: GoalCategory; emoji: string; color: string }> = [
  { value: 'Saúde', emoji: '💪', color: '#10B981' },
  { value: 'Trabalho', emoji: '💼', color: '#208AEF' },
  { value: 'Estudos', emoji: '📚', color: '#8B5CF6' },
  { value: 'Finanças', emoji: '💰', color: '#F59E0B' },
  { value: 'Família', emoji: '👨‍👩‍👧', color: '#EC4899' },
  { value: 'Pessoal', emoji: '🌱', color: '#14B8A6' },
  { value: 'Outro', emoji: '🎯', color: '#6B7280' },
];

export function categoryMeta(category: string): { emoji: string; color: string } {
  const found = GOAL_CATEGORIES.find((c) => c.value === category);
  return found ?? { emoji: '🎯', color: '#6B7280' };
}
