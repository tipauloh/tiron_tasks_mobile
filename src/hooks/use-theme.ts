import { useColorScheme } from 'react-native';
import { getTheme } from '../constants/theme';

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return { theme: getTheme(scheme), scheme };
}
