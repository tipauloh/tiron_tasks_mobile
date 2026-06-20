import { create } from 'zustand';

type ViewMode = 'all' | 'today' | 'upcoming' | 'overdue' | 'favorites';

interface FilterState {
  viewMode: ViewMode;
  activeListId: string | null;
  searchQuery: string;
  setViewMode: (mode: ViewMode) => void;
  setActiveListId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  viewMode: 'today',
  activeListId: null,
  searchQuery: '',
  setViewMode: (viewMode) => set({ viewMode }),
  setActiveListId: (activeListId) => set({ activeListId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
