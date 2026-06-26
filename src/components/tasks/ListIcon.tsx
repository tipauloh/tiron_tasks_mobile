import React from 'react';
import { Text } from 'react-native';
import type { ColorValue } from 'react-native';
import { AppIcon, APP_ICONS, type AppIconName } from '@/components/ui/AppIcon';

/**
 * Ícone de uma lista de tarefas. O ícone é escolhido pelo usuário e guardado no
 * campo `icon` da lista. Agora usamos nomes do AppIcon (Feather), mas listas
 * ANTIGAS têm um emoji salvo — por isso mapeamos o emoji legado para o ícone
 * equivalente (compatibilidade), com fallback para o próprio emoji.
 */

export const PRESET_LIST_ICONS: AppIconName[] = [
  'listChecklist', 'listHome', 'listWork', 'listTarget', 'listStar', 'listBook',
  'listShopping', 'listFitness', 'listArt', 'listGrowth', 'listTools', 'listTravel',
  'listHeart', 'listMusic',
];

const LEGACY_EMOJI_MAP: Record<string, AppIconName> = {
  '📋': 'listChecklist',
  '🏠': 'listHome',
  '💼': 'listWork',
  '🎯': 'listTarget',
  '⭐': 'listStar',
  '📚': 'listBook',
  '🛒': 'listShopping',
  '💪': 'listFitness',
  '🎨': 'listArt',
  '🌱': 'listGrowth',
  '🔧': 'listTools',
  '✈️': 'listTravel',
  '❤️': 'listHeart',
  '🎵': 'listMusic',
  '📅': 'listCalendar',
  '🏷️': 'listTag',
};

/** Resolve o `icon` da lista para um AppIconName, ou null se for emoji desconhecido. */
export function resolveListIcon(icon?: string | null): AppIconName | null {
  if (!icon) return null;
  if (icon in APP_ICONS) return icon as AppIconName;
  if (icon in LEGACY_EMOJI_MAP) return LEGACY_EMOJI_MAP[icon];
  return null;
}

interface ListIconProps {
  icon?: string | null;
  size?: number;
  color?: ColorValue;
}

export function ListIcon({ icon, size = 16, color }: ListIconProps) {
  const resolved = resolveListIcon(icon);
  if (resolved) return <AppIcon name={resolved} size={size} color={color} />;
  // Fallback: emoji legado fora do preset — mantém o que o usuário escolheu.
  if (icon) return <Text style={{ fontSize: size - 2, color: color as string }}>{icon}</Text>;
  return null;
}
