// Metro config — Expo default + suporte a .wasm.
// O `expo-sqlite` (usado pelo cache offline, inclusive no módulo Microsoft 365)
// referencia `wa-sqlite.wasm` no bundle web. Sem registrar `wasm` como asset,
// o `expo export --platform all` (usado pelo `eas update`/OTA) falha ao resolver
// o módulo. Inócuo para iOS/Android (que não usam o worker web).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

module.exports = config;
