# CalDAV — 01 · Arquitetura

## Objetivo
Servidor CalDAV/WebDAV independente (`tiron-caldav`) que permite sincronização nativa
com Apple Calendar/Reminders, Outlook, Thunderbird e DAVx5, **sem acessar o Postgres** —
consumindo exclusivamente a API existente como camada de regra de negócio.

## Diagrama
```
iPhone / iPad / Mac / Outlook / Thunderbird / DAVx5
        │  CalDAV (HTTPS, RFC 4791/4918/5545)
        ▼
┌──────────────────────────┐   https://synctasks.tiron.com.br  (Traefik + Let's Encrypt)
│ tiron-caldav (container)  │   Radicale + plugins custom (auth + storage)
└───────────┬──────────────┘   + sidecar /health e /metrics
            │  REST  (X-Internal-Token + X-User-Id)
            ▼
┌──────────────────────────┐   /internal/caldav/*  (service-token; NÃO público)
│ API FastAPI (existente)   │   regra de negócio + mapeamento ↔ tasks/task_lists
└───────────┬──────────────┘
            ▼
┌──────────────────────────┐
│ PostgreSQL                │   (o container NUNCA toca aqui)
└──────────────────────────┘
```

## Decisões-chave
- **Engine: Radicale** (servidor CalDAV maduro; compatibilidade Apple/DAVx5 já resolvida),
  com **plugins custom**:
  - **Auth plugin** → valida usuário+token via `POST /internal/caldav/auth`.
  - **Storage plugin** → adapter REST: lê/grava collections e itens via `/internal/caldav/*`
    (não usa disco; stateless → escala horizontal).
- **Sidecar FastAPI/WSGI** para `/health` e `/metrics` (Prometheus), via `DispatcherMiddleware`.
- **Container isolado**: Dockerfile/requirements/logs/pipeline próprios; não compartilha
  runtime com a API. Pasta `services/caldav/`.
- **Toda regra de negócio fica na API.** O container é só gateway de sincronização
  (protocolo CalDAV + conversão iCalendar↔campos normalizados).

## Componentes do container
| Arquivo | Papel |
|---|---|
| `tiron_caldav/auth.py` | Radicale `BaseAuth` → `/internal/caldav/auth` |
| `tiron_caldav/storage.py` | Radicale `BaseStorage` → adapter REST |
| `tiron_caldav/api_client.py` | cliente tipado do contrato interno |
| `tiron_caldav/ical.py` | VTODO/VEVENT ↔ campos normalizados (`icalendar`) |
| `tiron_caldav/wsgi.py` | app composto: Radicale + /health + /metrics |
| `config/radicale.conf` | server/auth/storage |
| `Dockerfile`, `requirements.txt`, `docker-compose.dev.yml` | runtime |

## Multi-tenant / isolamento
Cada requisição resolve `user_id` a partir do token CalDAV (auth) e passa `X-User-Id` à
API. A API filtra **sempre** por `user_id` (e `tenant_id` quando existir). Um usuário
nunca enxerga dados de outro. (Projeto atual sem tenants → `tenant_id = null`.)

## Escalabilidade
Container stateless (storage é o adapter REST, sem disco) → réplicas horizontais atrás do
Traefik. Cache/ctag por collection reduz tráfego de sync.
