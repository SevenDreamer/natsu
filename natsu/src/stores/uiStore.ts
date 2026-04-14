import { create } from 'zustand';

interface UIState {
  isMobile: boolean;
  sidebarOpen: boolean;
  previewOpen: boolean;
  drawerOpen: boolean;
  terminalOpen: boolean;
  chatOpen: boolean;
  automationOpen: boolean;
  terminalHeight: number;
  setMobile: (isMobile: boolean) => void;
  toggleSidebar: () => void;
  togglePreview: () => void;
  toggleDrawer: () => void;
  toggleTerminal: () => void;
  toggleChat: () => void;
  toggleAutomation: () => void;
  setTerminalOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setAutomationOpen: (open: boolean) => void;
  setTerminalHeight: (height: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobile: false,
  sidebarOpen: true,
  previewOpen: true,
  drawerOpen: false,
  terminalOpen: false,
  chatOpen: false,
  automationOpen: false,
  terminalHeight: 250,

  setMobile: (isMobile: boolean) => set({ isMobile }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  toggleAutomation: () => set((state) => ({ automationOpen: !state.automationOpen })),
  setTerminalOpen: (open: boolean) => set({ terminalOpen: open }),
  setChatOpen: (open: boolean) => set({ chatOpen: open }),
  setAutomationOpen: (open: boolean) => set({ automationOpen: open }),
  setTerminalHeight: (height: number) => set({ terminalHeight: height }),
}));
