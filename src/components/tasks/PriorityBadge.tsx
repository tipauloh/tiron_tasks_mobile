import React from 'react';
import { Badge } from '../ui/Badge';
import { TaskPriority } from '../../domain/entities';

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
}

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: '#6B7280', label: 'Baixa' },
  normal: { color: '#3B82F6', label: 'Normal' },
  high: { color: '#F59E0B', label: 'Alta' },
  critical: { color: '#EF4444', label: 'Crítica' },
};

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <Badge
      label={config.label}
      color={config.color}
      textColor="#FFFFFF"
      size={size}
    />
  );
}
