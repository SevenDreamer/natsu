import { create } from 'zustand';

interface UIState {
  isMobile: boolean;
  sidebarOpen: boolean;
  previewOpen: boolean;
  drawerOpen: boolean;
  terminalOpen: boolean;
  terminalHeight: number;
  setMobile: (isMobile: boolean) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  toggleDrawer: () => void;
  toggleTerminal: () => void;
  setTerminalOpen: (open: boolean) => void;
  setTerminalHeight: (height: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobile: false,
  sidebarOpen: true,
  previewOpen: true,
  drawerOpen: false,
  terminalOpen: false,
  terminalHeight: 250,

  setMobile: (isMobile: boolean) => set({ isMobile }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  setTerminalOpen: (open: boolean) => set({ terminalOpen: open }),
  setTerminalHeight: (height: number) => set({ terminalHeight: height }),
}));
