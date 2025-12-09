import { create } from 'zustand';

interface UIState {
  isCartOpen: boolean;
  toggleCart: () => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCartOpen: false,
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
}));
