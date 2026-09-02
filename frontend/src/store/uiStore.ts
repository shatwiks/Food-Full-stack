import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isAuthOpen: boolean;
  isOrdersOpen: boolean;
  isDashboardOpen: boolean;
  selectedCuisine: string;
  refreshTrigger: number;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAuthOpen: (open: boolean) => void;
  setOrdersOpen: (open: boolean) => void;
  setDashboardOpen: (open: boolean) => void;
  setSelectedCuisine: (cuisine: string) => void;
  triggerRefresh: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isAuthOpen: false,
  isOrdersOpen: false,
  isDashboardOpen: false,
  selectedCuisine: 'All',
  refreshTrigger: 0,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setAuthOpen: (open) => set({ isAuthOpen: open }),
  setOrdersOpen: (open) => set({ isOrdersOpen: open }),
  setDashboardOpen: (open) => set({ isDashboardOpen: open }),
  setSelectedCuisine: (cuisine) => set({ selectedCuisine: cuisine }),
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));
