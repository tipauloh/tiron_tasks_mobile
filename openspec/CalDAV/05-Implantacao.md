# CalDAV — 05 · Guia de Implantação

## Pré-requisitos (você)
- **DNS:** registrar `synctasks.tiron.com.br` → IP do VPS (`72.62.138.144`), atrás do
  Cloudflare (modo "DNS only"/cinza para o Let's Encrypt HTTP-01 funcionar, ou usar o
  proxy laranja com Full/Strict).
- O VPS já tem **Traefik + Let's Encrypt** (rede externa `traefik-public`, resolver
  `letsencrypt`, entrypoint `websecure`).

## Segredo compartilhado
Gerar um `CALDAV_INTERNAL_SECRET` (ex.: `openssl rand -hex 32`) e configurá-lo em **ambos**:
- API (`/opt/apps/tiron-api/.env` → `CALDAV_INTERNAL_SECRET=...`) → restart do `api_app`.
- Container caldav (`/opt/apps/tiron-caldav/.env`).

## Estrutura no VPS
`/opt/apps/tiron-caldav/` ← rsync de `services/caldav/`, com um `docker-compose.yml`:
```yaml
services:
  caldav:
    build: .
    image: tiron_caldav
    container_name: tiron_caldav
    restart: unless-stopped
    env_file: .env          # API_BASE, CALDAV_INTERNAL_SECRET, LOG_LEVEL
    environment:
      - API_BASE=http://api_app:80     # rede interna; evita ida ao Traefik
    networks: [traefik-public, api_default]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tiron-caldav.rule=Host(`synctasks.tiron.com.br`)"
      - "traefik.http.routers.tiron-caldav.entrypoints=websecure"
      - "traefik.http.routers.tiron-caldav.tls.certresolver=letsencrypt"
      - "traefik.http.services.tiron-caldav.loadbalancer.server.port=5232"
      - "traefik.http.routers.tiron-caldav.middlewares=secure-headers@file"
networks:
  traefik-public: { external: true }
  api_default: { external: true }   # para alcançar api_app na rede interna
```
> O container fala com a API pela **rede interna** (`http://api_app:80`), não pela URL
> pública — mais rápido e mantém `/internal/*` fora da internet.

## Passos de deploy
1. `rsync services/caldav/ → /opt/apps/tiron-caldav/` (exclui `.venv`, `__pycache__`).
2. Criar `/opt/apps/tiron-caldav/.env` (API_BASE, CALDAV_INTERNAL_SECRET).
3. Garantir `CALDAV_INTERNAL_SECRET` no `.env` da API e reiniciar `api_app`.
4. `cd /opt/apps/tiron-caldav && docker compose up -d --build`.
5. Traefik emite o certificado para `synctasks.tiron.com.br` automaticamente.
6. Validar: `curl https://synctasks.tiron.com.br/health` → `{"status":"ok"}`.

## Verificação de descoberta CalDAV
`curl -u user:token https://synctasks.tiron.com.br/.well-known/caldav` deve redirecionar/
responder ao principal. `PROPFIND` no principal deve listar a `calendar-home-set`.

## App mobile
A tela **Perfil → Integrações → CalDAV** já exibe servidor/usuário/senha + tutorial.
Entregue por **OTA**.
