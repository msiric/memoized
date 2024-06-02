import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { create } from 'zustand'

interface AuthStore {
  user: UserWithSubscriptionsAndProgress | null | undefined
  isModalOpen: boolean
  setUser: (data: UserWithSubscriptionsAndProgress | null) => void
  toggleModal: () => void
  openModal: () => void
  closeModal: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: undefined,
  isModalOpen: false,
  setUser: (data) => set({ user: data }),
  toggleModal: () => set((state) => ({ isModalOpen: !state.isModalOpen })),
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}))
