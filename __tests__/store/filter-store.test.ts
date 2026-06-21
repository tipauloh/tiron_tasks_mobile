/**
 * Testes unitários do filter-store (Zustand).
 * Cobre: setViewMode, setActiveListId, setSearchQuery e estado inicial.
 */

import { useFilterStore } from '../../src/store/filter-store';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getStore() {
  return useFilterStore.getState();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useFilterStore.setState({
    viewMode: 'today',
    activeListId: null,
    searchQuery: '',
  });
});

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

describe('estado inicial', () => {
  it('viewMode é "today" por padrão', () => {
    expect(getStore().viewMode).toBe('today');
  });

  it('activeListId é null por padrão', () => {
    expect(getStore().activeListId).toBeNull();
  });

  it('searchQuery é string vazia por padrão', () => {
    expect(getStore().searchQuery).toBe('');
  });
});

// ---------------------------------------------------------------------------
// setViewMode
// ---------------------------------------------------------------------------

describe('setViewMode', () => {
  it('altera para "all"', () => {
    getStore().setViewMode('all');
    expect(getStore().viewMode).toBe('all');
  });

  it('altera para "upcoming"', () => {
    getStore().setViewMode('upcoming');
    expect(getStore().viewMode).toBe('upcoming');
  });

  it('altera para "overdue"', () => {
    getStore().setViewMode('overdue');
    expect(getStore().viewMode).toBe('overdue');
  });

  it('altera para "favorites"', () => {
    getStore().setViewMode('favorites');
    expect(getStore().viewMode).toBe('favorites');
  });

  it('altera para "today"', () => {
    getStore().setViewMode('all');
    getStore().setViewMode('today');
    expect(getStore().viewMode).toBe('today');
  });

  it('não altera outros campos ao mudar o viewMode', () => {
    useFilterStore.setState({ activeListId: 'list-001', searchQuery: 'teste' });
    getStore().setViewMode('all');
    expect(getStore().activeListId).toBe('list-001');
    expect(getStore().searchQuery).toBe('teste');
  });
});

// ---------------------------------------------------------------------------
// setActiveListId
// ---------------------------------------------------------------------------

describe('setActiveListId', () => {
  it('define o ID de lista ativo', () => {
    getStore().setActiveListId('list-abc');
    expect(getStore().activeListId).toBe('list-abc');
  });

  it('aceita null para limpar a lista ativa', () => {
    getStore().setActiveListId('list-abc');
    getStore().setActiveListId(null);
    expect(getStore().activeListId).toBeNull();
  });

  it('não altera viewMode ou searchQuery ao mudar activeListId', () => {
    useFilterStore.setState({ viewMode: 'upcoming', searchQuery: 'query' });
    getStore().setActiveListId('list-xyz');
    expect(getStore().viewMode).toBe('upcoming');
    expect(getStore().searchQuery).toBe('query');
  });
});

// ---------------------------------------------------------------------------
// setSearchQuery
// ---------------------------------------------------------------------------

describe('setSearchQuery', () => {
  it('define a query de busca', () => {
    getStore().setSearchQuery('tarefa importante');
    expect(getStore().searchQuery).toBe('tarefa importante');
  });

  it('aceita string vazia para limpar a busca', () => {
    getStore().setSearchQuery('algo');
    getStore().setSearchQuery('');
    expect(getStore().searchQuery).toBe('');
  });

  it('não altera viewMode ou activeListId ao mudar searchQuery', () => {
    useFilterStore.setState({ viewMode: 'overdue', activeListId: 'list-001' });
    getStore().setSearchQuery('nova busca');
    expect(getStore().viewMode).toBe('overdue');
    expect(getStore().activeListId).toBe('list-001');
  });

  it('sobrescreve query anterior', () => {
    getStore().setSearchQuery('primeira');
    getStore().setSearchQuery('segunda');
    expect(getStore().searchQuery).toBe('segunda');
  });
});
