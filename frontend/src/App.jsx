import React, { useState, useEffect } from 'react';
import { EditorProvider } from './contexts/EditorContext';
import { CommandProvider, useCommands } from './contexts/CommandContext';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import EditorPane from './components/EditorPane';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import { isWailsEnv, getWailsFs } from './utils/wails';

function AppInner() {
  const [activeView, setActiveView] = useState('explorer');
  const [rootPath, setRootPath] = useState('');
  const { registerCommands, openPalette } = useCommands();

  // Register built-in commands (keyboard shortcuts are dispatched by CommandContext)
  useEffect(() => {
    registerCommands([
      {
        id: 'openFolder',
        label: 'Open Folder...',
        keybinding: 'Ctrl+O',
        handler: async () => {
          const fs = getWailsFs();
          if (fs) {
            try {
              const path = await fs.OpenFolderDialog();
              if (path) setRootPath(path);
            } catch (err) {
              console.error('Failed to open folder:', err);
            }
          }
        },
      },
      {
        id: 'commandPalette',
        label: 'Command Palette',
        keybinding: 'Ctrl+Shift+P',
        handler: () => openPalette(),
      },
      {
        id: 'toggleSidebar',
        label: 'Toggle Sidebar Visibility',
        keybinding: 'Ctrl+B',
        handler: () => setActiveView(prev => prev ? null : 'explorer'),
      },
      {
        id: 'showExplorer',
        label: 'Show Explorer',
        keybinding: 'Ctrl+Shift+E',
        handler: () => setActiveView('explorer'),
      },
      {
        id: 'showSearch',
        label: 'Show Search',
        keybinding: 'Ctrl+Shift+F',
        handler: () => setActiveView('search'),
      },
      {
        id: 'showGit',
        label: 'Show Source Control',
        keybinding: 'Ctrl+Shift+G',
        handler: () => setActiveView('git'),
      },
      {
        id: 'showExtensions',
        label: 'Show Extensions',
        keybinding: 'Ctrl+Shift+X',
        handler: () => setActiveView('extensions'),
      },
    ]);
  }, [registerCommands, openPalette]);

  return (
    <div className="app-shell">
      <div className="app-main">
        <ActivityBar activeView={activeView} onViewChange={setActiveView} />
        <Sidebar activeView={activeView} rootPath={rootPath} />
        <div className="editor-area">
          <TabBar />
          <EditorPane />
        </div>
      </div>
      <StatusBar />
      <CommandPalette />

      <style>{`
        .app-shell {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .app-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <CommandProvider>
        <AppInner />
      </CommandProvider>
    </EditorProvider>
  );
}
