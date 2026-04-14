import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';
import { PreviewPanel } from './PreviewPanel';
import { MobileDrawer } from './MobileDrawer';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { ChatView, ConversationList } from '@/components/chat';
import { AutomationPanel } from '@/components/automation/AutomationPanel';
import { useUIStore } from '@/stores/uiStore';

const MOBILE_BREAKPOINT = 768;

export function AppLayout() {
  const [mounted, setMounted] = useState(false);

  const isMobile = useUIStore((s) => s.isMobile);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const previewOpen = useUIStore((s) => s.previewOpen);
  const drawerOpen = useUIStore((s) => s.drawerOpen);
  const terminalOpen = useUIStore((s) => s.terminalOpen);
  const chatOpen = useUIStore((s) => s.chatOpen);
  const automationOpen = useUIStore((s) => s.automationOpen);
  const setMobile = useUIStore((s) => s.setMobile);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const togglePreview = useUIStore((s) => s.togglePreview);
  const toggleDrawer = useUIStore((s) => s.toggleDrawer);
  const toggleTerminal = useUIStore((s) => s.toggleTerminal);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setMobile]);

  // Keyboard shortcut for terminal toggle (Ctrl+`)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` (backtick) to toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTerminal]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="h-14 flex items-center px-4 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={toggleDrawer}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 font-semibold">纳兹 Natsu</h1>
        </header>
        <main className="flex-1 overflow-hidden">
          <MainPanel />
        </main>
        {terminalOpen && (
          <TerminalPanel className="shrink-0" />
        )}
        <MobileDrawer open={drawerOpen} onClose={toggleDrawer}>
          <div className="p-4 text-sm text-muted-foreground">
            File navigation will appear here
          </div>
        </MobileDrawer>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen flex bg-background">
      <Sidebar collapsed={!sidebarOpen} onToggle={toggleSidebar} />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0">
            <MainPanel />
          </div>
          <PreviewPanel collapsed={!previewOpen} onToggle={togglePreview} />
          {chatOpen && (
            <div className="w-[500px] border-l flex-shrink-0 flex">
              <div className="w-48 flex-shrink-0">
                <ConversationList />
              </div>
              <div className="flex-1 min-w-0">
                <ChatView />
              </div>
            </div>
          )}
          {automationOpen && (
            <div className="w-[400px] border-l flex-shrink-0 p-4">
              <AutomationPanel />
            </div>
          )}
        </div>
        {terminalOpen && (
          <TerminalPanel className="shrink-0" />
        )}
      </main>
    </div>
  );
}
