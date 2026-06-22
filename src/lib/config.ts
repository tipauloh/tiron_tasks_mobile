import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL: string = extra.apiUrl ?? 'https://api.tiron.com.br';
// URL pública do app_web (Laravel) — usada apenas para os endpoints de
// recuperação de senha (/api/mobile/password/*). Diferente da API_URL.
export const WEB_URL: string = extra.webUrl ?? 'https://tasks.tiron.com.br';
export const APP_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';
export const APP_NAME: string = Constants.expoConfig?.name ?? 'Tiron Tasks';

// Client IDs PÚBLICOS do Google OAuth (não são segredos — o client secret fica
// somente no backend). Usados para configurar o @react-native-google-signin.
export const GOOGLE_WEB_CLIENT_ID: string = extra.googleWebClientId ?? '';
export const GOOGLE_IOS_CLIENT_ID: string = extra.googleIosClientId ?? '';

// Client ID PÚBLICO do Microsoft Entra App Registration (não é segredo — o app
// mobile é public client e usa PKCE por sessão). Ver
// docs/integrations/microsoft365/authentication.md.
export const MICROSOFT_CLIENT_ID: string = extra.microsoftClientId ?? '';
