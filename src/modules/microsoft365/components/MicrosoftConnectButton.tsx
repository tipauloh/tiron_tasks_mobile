import React from 'react';
import { Button } from '../../../components/ui';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
}

/** Botão principal para iniciar a conexão com a Microsoft. */
export function MicrosoftConnectButton({ onPress, loading, disabled, title }: Props) {
  return (
    <Button
      title={title ?? 'Conectar Conta'}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      size="lg"
    />
  );
}
