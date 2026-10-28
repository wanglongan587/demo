import { create } from 'zustand'

export type Filter = 'all' | 'active' | 'done'

interface FilterState {
  filter: Filter
  setFilter: (filter: Filter) => void
}

export const useFilter = create<FilterState>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}))
