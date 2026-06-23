# CalDAV — 06 · Operação & Troubleshooting

## Observabilidade
- **Health:** `GET https://synctasks.tiron.com.br/health` → `{"status":"ok"}`.
- **Métricas:** `GET /metrics` (Prometheus): conexões/syncs ativas, syncs realizadas,
  erros de sync, latência (histograma).
- **Logs:** JSON estruturado no stdout do container (`docker logs tiron_caldav`).
  Auditoria de login/criação/edição/exclusão na API (`audit_logs`).

## Configuração de cliente
### iPhone / iPad / Mac
Ajustes → Apps → Calendário → Contas → Adicionar Conta → **Outra** → **Adicionar conta
CalDAV** → Servidor `synctasks.tiron.com.br`, Usuário, Senha (token). Os **calendários**
aparecem no app **Calendário**; as **tarefas** no app **Lembretes**.
### Android (DAVx5)
Adicionar conta → "Login com URL e nome de usuário" → URL `https://synctasks.tiron.com.br`.
### Thunderbird / Outlook
Adicionar calendário em rede → CalDAV → mesma URL + credenciais.

## Troubleshooting
| Sintoma | Causa provável | Ação |
|---|---|---|
| Cliente não conecta | DNS/TLS | `curl https://synctasks.tiron.com.br/health`; ver cert no Traefik; DNS apontando? |
| 401 ao configurar | token errado/revogado | regenerar token no app; conferir usuário |
| 403 nas chamadas internas | `CALDAV_INTERNAL_SECRET` divergente | igualar o secret na API e no container; restart |
| Calendários não aparecem | descoberta (principal/home-set) | testar `PROPFIND` no principal; ver logs do container |
| Tarefas não aparecem no Lembretes | `supported-calendar-component-set` | confirmar `VTODO` na collection |
| Item duplicado | UID instável | conferir `caldav_uid`/`tiron-{id}` no mapeamento |
| Mudança não sincroniza | `ctag/etag` não muda | conferir cálculo de ctag/etag (updated_at) |

## ⚠️ Compatibilidade Apple é iterativa
Mesmo com Radicale, a Apple tem peculiaridades de descoberta/namespaces. O fluxo correto:
testar no dispositivo real → coletar o log do container (request bruto) → ajustar o
plugin de storage/props. **Testes em dispositivo são feitos por você; eu ajusto a cada
erro reportado.**

## Operação
- **Escala:** subir réplicas do `tiron_caldav` (stateless) atrás do Traefik.
- **Rotação de secret:** atualizar `CALDAV_INTERNAL_SECRET` na API e no container juntos.
- **Revogar acesso de um usuário:** revogar o token no app (ou `DELETE /api/v1/caldav/tokens/{id}`).
