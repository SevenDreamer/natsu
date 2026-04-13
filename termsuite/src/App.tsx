import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSettingsStore } from '@/stores/settingsStore';
import { storageApi } from '@/lib/tauri';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

function FirstLaunchWizard() {
  const [isSelecting, setIsSelecting] = useState(false);
  const setStoragePath = useSettingsStore((s) => s.setStoragePath);

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    try {
      // For now, use a default path since dialog may not work in all environments
      const defaultPath = `${window.localStorage.getItem('home') || '.'}/termsuite-data`;
      await storageApi.init(defaultPath);
      await storageApi.setPath(defaultPath);
      setStoragePath(defaultPath);
    } catch (error) {
      console.error('Failed to select storage path:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to TermSuite</CardTitle>
          <CardDescription>
            Choose where to store your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Your notes will be stored as Markdown files in the selected folder.
            You can change this later in settings.
          </p>

          <Button
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="w-full"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {isSelecting ? 'Setting up...' : 'Use Default Location'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            A raw/, wiki/, and outputs/ folder will be created automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useSettingsStore((s) => s.isInitialized);
  const setStoragePath = useSettingsStore((s) => s.setStoragePath);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const path = await storageApi.getPath();
        if (path) {
          setStoragePath(path);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [setStoragePath]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isInitialized) {
    return <FirstLaunchWizard />;
  }

  return <AppLayout />;
}

export default App;
