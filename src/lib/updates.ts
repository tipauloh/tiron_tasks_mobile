import * as Updates from 'expo-updates';

export const APP_ENV = process.env.APP_ENV ?? 'development';
export const isProduction = APP_ENV === 'production';
export const isHomolog = APP_ENV === 'homolog';
export const isDevelopment = APP_ENV === 'development' || __DEV__;
export const updateChannel = Updates.channel ?? 'development';
export const updateRuntimeVersion = Updates.runtimeVersion ?? '1.0.0';

export type UpdateCheckResult =
  | { status: 'up-to-date' }
  | { status: 'updated'; manifest: Updates.UpdateManifest }
  | { status: 'error'; error: unknown }
  | { status: 'skipped' };

/**
 * Verifica e aplica atualizações OTA silenciosamente.
 *
 * Comportamento:
 * 1. Verifica se há update disponível no channel ativo
 * 2. Faz download silencioso
 * 3. Recarrega o app para aplicar
 *
 * Em desenvolvimento (__DEV__) é sempre no-op.
 */
export async function checkAndApplyUpdate(): Promise<UpdateCheckResult> {
  if (__DEV__) return { status: 'skipped' };

  try {
    const check = await Updates.checkForUpdateAsync();

    if (!check.isAvailable) {
      return { status: 'up-to-date' };
    }

    const fetchResult = await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();

    return { status: 'updated', manifest: fetchResult.manifest };
  } catch (error) {
    console.warn('[OTA] Falha ao verificar atualizações:', error);
    return { status: 'error', error };
  }
}

/**
 * Força recarga do app (equivale a rollback para o bundle em cache).
 * Para rollback real de OTA, use o painel EAS: eas update --rollback
 */
export async function reloadApp(): Promise<void> {
  if (__DEV__) return;
  try {
    await Updates.reloadAsync();
  } catch (error) {
    console.error('[OTA] Falha ao recarregar:', error);
    throw error;
  }
}

/**
 * Retorna informações do update atual para diagnóstico.
 */
export function getUpdateInfo() {
  return {
    channel: updateChannel,
    runtimeVersion: updateRuntimeVersion,
    updateId: Updates.updateId ?? null,
    isEmbedded: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt ?? null,
    env: APP_ENV,
  };
}
