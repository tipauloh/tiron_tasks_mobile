# Spec — Offline First

**Projeto:** Tiron Tasks Mobile
**Data:** 2026-06-20
**Status:** Fase 1 implementada (SQLite local). Fase 2 (sincronização) a especificar.

## Princípio

O aplicativo deve funcionar completamente sem conexão à internet. Toda operação de leitura e escrita é executada localmente primeiro. A sincronização com servidor é um detalhe de infraestrutura, não um requisito para funcionar.

## Fase 1 — Banco Local Puro

### Implementação atual

- Todas as operações usam `expo-sqlite` local.
- Nenhuma chamada de rede é feita.
- Dados persistem no dispositivo (`tiron_tasks.db`).
- Não há verificação de conectividade.

### Garantias

- **Durabilidade:** SQLite é transacional — operações completam ou revertam, nunca corrompem.
- **Disponibilidade:** 100% offline — sem dependência de rede.
- **Performance:** Operações síncronas (`getAllSync`, `runSync`) — sem latência de rede, sem callbacks.

### Limitações da Fase 1

- Dados existem apenas no dispositivo.
- Sem backup automático.
- Sem compartilhamento entre dispositivos ou usuários.
- Sem acesso via web.

## Fase 2 — Sincronização com Servidor (Futuro)

### Estratégia proposta: Local-first com sync em background

1. **Escrita sempre local primeiro.** O usuário recebe feedback imediato.
2. **Fila de operações pendentes.** Cada mutação gera uma entrada em uma fila local (`sync_queue`).
3. **Sync em background.** Quando há conexão, o app processa a fila enviando operações ao servidor.
4. **Merge do servidor.** O servidor retorna o estado atual; o app aplica um diff.

### Tabela de fila de sincronização (proposta)

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,  -- 'create' | 'update' | 'delete'
  entity_type TEXT NOT NULL, -- 'task' | 'task_list' | 'label'
  entity_id TEXT NOT NULL,
  payload TEXT,              -- JSON serializado da mutação
  created_at TEXT NOT NULL,
  retries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
```

### Resolução de Conflitos (proposta)

Estratégia inicial: **Last Write Wins (LWW)** baseado em `updated_at`.

- O servidor mantém `updated_at` para cada registro.
- Se o servidor tem `updated_at` mais recente, os dados do servidor prevalecem.
- Se o local tem `updated_at` mais recente, os dados locais prevalecem (e o servidor é atualizado).
- Conflitos genuínos (duas edições concorrentes) são resolvidos pelo servidor (campo com `updated_at` mais recente vence por campo, não por registro inteiro — a definir).

### Considerações para Fase 2

- Adicionar campo `server_id` (UUID do servidor) para mapear IDs locais a IDs remotos.
- Adicionar campo `synced_at` para saber quando foi sincronizado pela última vez.
- Indicador visual de status de sync (ícone de nuvem na UI).
- Retry com backoff exponencial para operações falhas.
- Deletions: registros deletados localmente entram na fila como `operation: 'delete'` para propagação ao servidor.

### Repositório de API (Fase 2)

A interface `TaskRepository` é a mesma — apenas a implementação muda:

```typescript
// src/infrastructure/api/task-repository.ts
export class ApiTaskRepository implements TaskRepository {
  // Usa fetch/axios + TanStack Query internamente
  // Mantém a mesma assinatura de métodos
}
```

A store (`task-store.ts`) apenas troca qual implementação instancia — nenhuma mudança na presentation.
