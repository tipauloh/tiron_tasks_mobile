import React from 'react';
import { EmptyState } from '../../../components/ui';

interface Props {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado vazio do módulo (sem itens sincronizados). */
export function MicrosoftEmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <EmptyState
      icon="📭"
      title={title ?? 'Nada sincronizado ainda'}
      description={
        description ??
        'Quando você sincronizar, seus e-mails sinalizados e tarefas do Microsoft To Do aparecerão aqui.'
      }
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
