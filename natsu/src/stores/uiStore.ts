import { create } from 'zustand';

interface UIState {
  isMobile: boolean;
  sidebarOpen: boolean;
  previewOpen: boolean;
  drawerOpen: boolean;
  setMobile: (isMobile: boolean) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  toggleDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobile: false,
  sidebarOpen: true,
  previewOpen: true,
  drawerOpen: false,

  setMobile: (isMobile: boolean) => set({ isMobile }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
}));
