import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

type ViewMode = 'all' | 'today' | 'upcoming' | 'overdue' | 'favorites' | 'completed';

interface FilterState {
  viewMode: ViewMode;
  activeListId: string | null;
  searchQuery: string;
  showCompleted: boolean;
  setViewMode: (mode: ViewMode) => void;
  setActiveListId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setShowCompleted: (show: boolean) => void;
  toggleShowCompleted: () => void;
}

const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore storage failures silently
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      viewMode: 'today',
      activeListId: null,
      searchQuery: '',
      showCompleted: false,
      setViewMode: (viewMode) => set({ viewMode }),
      setActiveListId: (activeListId) => set({ activeListId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setShowCompleted: (showCompleted) => set({ showCompleted }),
      toggleShowCompleted: () => set((s) => ({ showCompleted: !s.showCompleted })),
    }),
    {
      name: 'filter-store-v1',
      storage: createJSONStorage(() => secureStorage),
      // searchQuery não é persistido — busca sempre começa limpa
      partialize: (s) => ({ viewMode: s.viewMode, activeListId: s.activeListId, showCompleted: s.showCompleted }) as FilterState,
    },
  ),
);
