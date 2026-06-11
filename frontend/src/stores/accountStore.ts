import { create } from 'zustand'
import type { Account } from '../types'

interface AccountStore {
  accounts: Account[]
  selectedAccountId: string
  selectedCategory: string
  setAccounts: (accounts: Account[]) => void
  selectAccount: (id: string) => void
  selectCategory: (category: string) => void
  getSelectedAccount: () => Account | undefined
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  selectedAccountId: '',
  selectedCategory: '',
  setAccounts: (accounts) => set({ accounts }),
  selectAccount: (id) => set({ selectedAccountId: id }),
  selectCategory: (category) => set({ selectedCategory: category }),
  getSelectedAccount: () => get().accounts.find((a) => a.id === get().selectedAccountId),
}))
