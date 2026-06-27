import { Alert } from 'react-native';

type ToggleVars = { id: string; status: string; recurAction?: 'next' | 'end' };
type ToggleFn = (vars: ToggleVars) => void;

interface ToggleableTask {
  id: string;
  status: string;
  isRecurring?: boolean;
}

/**
 * Alterna o status de conclusão de uma tarefa. Se for uma tarefa RECORRENTE e
 * estiver sendo concluída, pergunta se o usuário quer manter a próxima ocorrência
 * (fecha esta e reabre uma idêntica na data seguinte) ou encerrar a recorrência.
 * Reabrir ou concluir tarefa simples segue direto.
 */
export function toggleTaskCompletion(task: ToggleableTask, toggle: ToggleFn): void {
  const isCompleting = task.status !== 'completed';

  if (isCompleting && task.isRecurring) {
    Alert.alert(
      'Tarefa recorrente',
      'Esta tarefa se repete. Como deseja concluí-la?',
      [
        {
          text: 'Concluir e manter a próxima',
          onPress: () => toggle({ id: task.id, status: 'completed', recurAction: 'next' }),
        },
        {
          text: 'Concluir e encerrar',
          style: 'destructive',
          onPress: () => toggle({ id: task.id, status: 'completed', recurAction: 'end' }),
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
    return;
  }

  toggle({ id: task.id, status: isCompleting ? 'completed' : 'not_started' });
}
