# CalDAV — 02 · Mapeamento de Entidades

## Observação importante
O Tiron **não possui entidade "Evento"** — possui **tarefas** (`tasks`, com
`due_date`/`start_time`/`end_time`) e **listas** (`task_lists`). O mapeamento abaixo
reflete isso.

## Calendário ⇄ Collection
| Tiron | CalDAV |
|---|---|
| `task_list` | Calendar Collection (`/caldav/<user>/<lista>/`) |
| nome da lista | `D:displayname` |
| cor da lista | `ICAL:calendar-color` |
| (derivado) | `CS:getctag` = muda quando a lista muda |
| componente | `supported-calendar-component-set = VTODO` (Reminders) |

Cada lista do usuário aparece como uma collection. (Opcional: uma collection "Agenda"
com `VEVENT` para tarefas com horário, exibida no app Calendário.)

## Tarefa ⇄ VTODO (Apple Reminders)
| Tiron (task) | iCalendar VTODO |
|---|---|
| `id` / `caldav_uid` | `UID` (`tiron-{id}@tirontasks.com` ou o UID enviado pelo cliente) |
| `title` | `SUMMARY` |
| `description` | `DESCRIPTION` |
| `due_date` (+ `start_time`) | `DUE` |
| `priority` (low/normal/high/critical) | `PRIORITY` (9 / 5 / 3 / 1) |
| `status` (completed?) | `STATUS` (`NEEDS-ACTION` / `COMPLETED`) |
| `completed_at` | `COMPLETED` |
| lista | `CATEGORIES` |
| `created_at` / `updated_at` | `CREATED` / `LAST-MODIFIED` / `DTSTAMP` |
| `updated_at` (hash) | `ETag` |

## Tarefa com horário ⇄ VEVENT (Apple Calendar) — extensão
| `start_time`/`end_time` + `due_date` | `DTSTART` / `DTEND` |
| sem horário | `all-day` (VALUE=DATE) |
| `title`/`description`/`location` | `SUMMARY`/`DESCRIPTION`/`LOCATION` |

## Sincronização bidirecional
- **Criado no iPhone** (PUT .ics): o container parseia o VTODO/VEVENT → campos
  normalizados → `PUT /internal/caldav/.../items/{uid}` → a API **cria/atualiza a task**
  e guarda `caldav_uid`.
- **Criado no Tiron**: a task aparece na próxima sync (o container gera o .ics com
  `UID = tiron-{id}@…`). `ctag`/`ETag` sinalizam mudanças aos clientes.
- **Concluir/editar/excluir** em qualquer lado reflete no outro (STATUS/COMPLETED, DELETE
  → soft-delete da task).

## Identidade dos itens (UID)
- Item criado pelo cliente: usa o `UID` do próprio cliente, salvo em `tasks.caldav_uid`.
- Item criado no Tiron: `UID = tiron-{task_id}@tirontasks.com` (estável).
- `GET/PUT/DELETE /items/{uid}` resolvem por `caldav_uid` **ou** pelo padrão `tiron-{id}`.

## Conversão de prioridade (CalDAV ↔ Tiron)
`PRIORITY 1–2 → critical · 3–4 → high · 5 → normal · 6–9/0 → low`. Inverso ao gerar VTODO.
