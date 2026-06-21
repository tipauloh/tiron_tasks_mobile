import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL: string = extra.apiUrl ?? 'https://api.tiron.com.br';
// URL pública do app_web (Laravel) — usada apenas para os endpoints de
// recuperação de senha (/api/mobile/password/*). Diferente da API_URL.
export const WEB_URL: string = extra.webUrl ?? 'https://tasks.tiron.com.br';
export const APP_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';
export const APP_NAME: string = Constants.expoConfig?.name ?? 'Tiron Tasks';
