# Testes — Microsoft 365

## Status atual
**231 testes** no projeto (18 suites), todos verdes. Do módulo M365:
- **summary**: resumo local entre 100–300 chars.
- **mappers**: GraphMessage/GraphTodoTask → Microsoft365Item.
- **repositories**: CRUD com db abstraído (fake).
- **service (mock)**: fluxo connect/sync/disconnect.
- **auth**: troca code→token (fetch mockado), refresh, erros de reautenticação.
- **graph**: paginação, 401 retry, 429 Retry-After, mapper de delta.
- **real-service**: orquestração de sync com Graph mockado.

## O que exige device/build (não cobrível em unit)
- Fluxo OAuth real no navegador (consentimento, redirect deep link).
- Notificações de sistema, Secure Store real.

## E2E (manual / futuro Detox) — roteiro
Conectar conta · sincronizar · abrir e-mail (webLink) · desconectar · reconectar · token expirado (refresh) · falha de auth · falha de rede (cache offline).

## Como rodar
`npm test` (Jest + jest-expo). Mocks evitam dependências nativas (`utils/id`, `fetch`).
