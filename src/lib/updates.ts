import * as Updates from 'expo-updates';

export async function checkForUpdates(): Promise<boolean> {
  if (__DEV__) return false;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const isProduction = !__DEV__;
export const updateChannel = Updates.channel ?? 'development';
