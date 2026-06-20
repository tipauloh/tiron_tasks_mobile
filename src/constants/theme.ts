import { Colors } from './colors';
import { FontSize, FontWeight, FontFamily } from './typography';
import { Spacing, Radius } from './spacing';

export { Colors, FontSize, FontWeight, FontFamily, Spacing, Radius };

export type ColorScheme = 'light' | 'dark';

export function getTheme(scheme: ColorScheme) {
  const palette = Colors[scheme];
  return {
    colors: { ...Colors, ...palette },
    fontSize: FontSize,
    fontWeight: FontWeight,
    fontFamily: FontFamily,
    spacing: Spacing,
    radius: Radius,
  };
}

export type Theme = ReturnType<typeof getTheme>;
