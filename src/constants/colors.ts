export const Colors = {
  // Brand
  primary: '#208AEF',
  primaryDark: '#1A70C5',
  primaryLight: '#E8F4FF',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Priority (usado em tarefas)
  priorityLow: '#6B7280',
  priorityNormal: '#3B82F6',
  priorityHigh: '#F59E0B',
  priorityCritical: '#EF4444',

  // Status
  statusNotStarted: '#9CA3AF',
  statusInProgress: '#3B82F6',
  statusCompleted: '#10B981',
  statusCancelled: '#6B7280',

  // Light theme
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.4)',
    shadow: 'rgba(0,0,0,0.08)',
  },

  // Dark theme
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    border: '#334155',
    borderLight: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#0F172A',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: 'rgba(0,0,0,0.3)',
  },
} as const;
