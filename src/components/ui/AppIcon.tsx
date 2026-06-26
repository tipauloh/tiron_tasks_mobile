import React from 'react';
import type { ColorValue } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

/**
 * Sistema CENTRAL de ícones da UI. Toda a interface deve usar <AppIcon name=… />
 * em vez de emojis ou de ícones de biblioteca direto, garantindo um traço
 * uniforme (outline, minimalista — estilo Lucide/Feather) e cores do tema.
 *
 * NÃO inclui ícones que são conteúdo/branding do usuário (emojis de categoria de
 * meta e de lista são escolhas do usuário e permanecem como estão).
 */

type IconDef = { lib: 'feather'; name: keyof typeof Feather.glyphMap }
  | { lib: 'ionicons'; name: keyof typeof Ionicons.glyphMap };

export const APP_ICONS = {
  // Navegação (tabs) e ações comuns
  tasks: { lib: 'feather', name: 'check-square' },
  calendar: { lib: 'feather', name: 'calendar' },
  goals: { lib: 'feather', name: 'target' },
  profile: { lib: 'feather', name: 'user' },
  search: { lib: 'feather', name: 'search' },
  edit: { lib: 'feather', name: 'edit-2' },
  trash: { lib: 'feather', name: 'trash-2' },
  plus: { lib: 'feather', name: 'plus' },
  close: { lib: 'feather', name: 'x' },
  check: { lib: 'feather', name: 'check' },
  back: { lib: 'feather', name: 'arrow-left' },
  refresh: { lib: 'feather', name: 'refresh-cw' },
  more: { lib: 'feather', name: 'more-horizontal' },
  filter: { lib: 'feather', name: 'filter' },
  chevronRight: { lib: 'feather', name: 'chevron-right' },
  chevronUp: { lib: 'feather', name: 'chevron-up' },
  chevronDown: { lib: 'feather', name: 'chevron-down' },
  chevronLeft: { lib: 'feather', name: 'chevron-left' },

  // Perfil / configurações / integrações
  lock: { lib: 'feather', name: 'lock' },
  timezone: { lib: 'feather', name: 'globe' },
  microsoft: { lib: 'ionicons', name: 'logo-windows' },
  caldav: { lib: 'feather', name: 'calendar' },
  mail: { lib: 'feather', name: 'mail' },
  id: { lib: 'feather', name: 'hash' },
  logout: { lib: 'feather', name: 'log-out' },
  app: { lib: 'feather', name: 'smartphone' },
  help: { lib: 'feather', name: 'help-circle' },
  settings: { lib: 'feather', name: 'settings' },

  // Estados (empty / erro)
  emptyDone: { lib: 'feather', name: 'check-circle' },
  emptyCalendar: { lib: 'feather', name: 'calendar' },
  emptyGoals: { lib: 'feather', name: 'target' },
  noResults: { lib: 'feather', name: 'search' },
  warning: { lib: 'feather', name: 'alert-triangle' },
  alert: { lib: 'feather', name: 'alert-circle' },
  inbox: { lib: 'feather', name: 'inbox' },

  // Tarefas
  flag: { lib: 'feather', name: 'flag' },
  clock: { lib: 'feather', name: 'clock' },
  repeat: { lib: 'feather', name: 'repeat' },
  bell: { lib: 'feather', name: 'bell' },
  members: { lib: 'feather', name: 'users' },
  star: { lib: 'feather', name: 'star' },
  list: { lib: 'feather', name: 'list' },
  sun: { lib: 'feather', name: 'sun' },
  sunrise: { lib: 'feather', name: 'sunrise' },

  // Status
  statusNotStarted: { lib: 'feather', name: 'circle' },
  statusInProgress: { lib: 'feather', name: 'disc' },
  statusCompleted: { lib: 'feather', name: 'check-circle' },
  statusCancelled: { lib: 'feather', name: 'x-circle' },

  // Prioridade
  priorityLow: { lib: 'feather', name: 'arrow-down' },
  priorityNormal: { lib: 'feather', name: 'minus' },
  priorityHigh: { lib: 'feather', name: 'arrow-up' },
  priorityCritical: { lib: 'feather', name: 'alert-triangle' },

  // Tendência (metas)
  trendUp: { lib: 'feather', name: 'trending-up' },
  trendStable: { lib: 'feather', name: 'minus' },
  trendDown: { lib: 'feather', name: 'trending-down' },

  // Tipos de KPI
  kpiNumber: { lib: 'feather', name: 'hash' },
  kpiPercent: { lib: 'feather', name: 'percent' },
  kpiCurrency: { lib: 'feather', name: 'dollar-sign' },
  kpiQuantity: { lib: 'feather', name: 'package' },
  kpiTime: { lib: 'feather', name: 'clock' },
  kpiWeight: { lib: 'feather', name: 'bar-chart-2' },
  kpiCustom: { lib: 'feather', name: 'edit-3' },

  // Auth / segurança
  success: { lib: 'feather', name: 'check-circle' },
  login: { lib: 'feather', name: 'log-in' },
  register: { lib: 'feather', name: 'user-plus' },
  send: { lib: 'feather', name: 'send' },
  eye: { lib: 'feather', name: 'eye' },
  eyeOff: { lib: 'feather', name: 'eye-off' },
  apple: { lib: 'ionicons', name: 'logo-apple' },
  google: { lib: 'ionicons', name: 'logo-google' },
} satisfies Record<string, IconDef>;

export type AppIconName = keyof typeof APP_ICONS;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
}

/** Ícone padronizado da UI. Cor herda do tema (texto) quando não informada. */
export function AppIcon({ name, size = 22, color }: AppIconProps) {
  const { theme } = useTheme();
  const def = APP_ICONS[name];
  const tint = (color ?? theme.colors.text) as string;
  if (def.lib === 'ionicons') {
    return <Ionicons name={def.name} size={size} color={tint} />;
  }
  return <Feather name={def.name} size={size} color={tint} />;
}
