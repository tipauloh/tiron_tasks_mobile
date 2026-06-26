import React from 'react';
import { EmptyState } from '../../../components/ui';

interface Props {
  message?: string;
  onRetry?: () => void;
}

/** Estado de erro (falha de sincronização/conexão). */
export function MicrosoftErrorState({ message, onRetry }: Props) {
  return (
    <EmptyState
      icon="warning"
      title="Algo deu errado"
      description={message ?? 'Não foi possível completar a operação. Tente novamente.'}
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      onAction={onRetry}
    />
  );
}
