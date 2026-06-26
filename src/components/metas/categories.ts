import type { GoalCategory } from '@/domain/entities';
import type { AppIconName } from '@/components/ui/AppIcon';

// Categorias de metas com ícone + cor — usadas no picker de criação e nos cards.
// O VALOR da categoria é o que se guarda; o ícone é derivado daqui.
export const GOAL_CATEGORIES: Array<{ value: GoalCategory; icon: AppIconName; color: string }> = [
  { value: 'Saúde', icon: 'catHealth', color: '#10B981' },
  { value: 'Trabalho', icon: 'catWork', color: '#208AEF' },
  { value: 'Estudos', icon: 'catStudies', color: '#8B5CF6' },
  { value: 'Finanças', icon: 'catFinance', color: '#F59E0B' },
  { value: 'Família', icon: 'catFamily', color: '#EC4899' },
  { value: 'Pessoal', icon: 'catPersonal', color: '#14B8A6' },
  { value: 'Outro', icon: 'catOther', color: '#6B7280' },
];

export function categoryMeta(category: string): { icon: AppIconName; color: string } {
  const found = GOAL_CATEGORIES.find((c) => c.value === category);
  return found ?? { icon: 'catOther', color: '#6B7280' };
}
