import { createSignal, onMount, Show } from 'solid-js';
import { EditorProvider } from './contexts/EditorContext';
import { CommandProvider, useCommands } from './contexts/CommandContext';
import { TerminalProvider, useTerminal } from './contexts/TerminalContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { GitProvider } from './contexts/GitContext';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Breadcrumbs from './components/Breadcrumbs';
import EditorPane from './components/EditorPane';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import QuickFileOpen from './components/QuickFileOpen';
import TerminalPanel from './components/TerminalPanel';
import KeyboardShortcutsPanel from './components/KeyboardShortcutsPanel';
import { getWailsFs } from './utils/wails';

function AppInner() {
  const [activeView, setActiveView] = createSignal('explorer');
  const [rootPath, setRootPath] = createSignal('');
  const [shortcutsVisible, setShortcutsVisible] = createSignal(false);
  const [quickOpenVisible, setQuickOpenVisible] = createSignal(false);
  const { registerCommands, openPalette } = useCommands();
  const { togglePanel, createTerminal: newTerm } = useTerminal();

  // Register built-in commands once on mount
  onMount(() => {
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
      // Editor shortcuts — handlers delegate to EditorPane static methods
      // so all keyboard shortcuts flow through the single CommandContext dispatcher.
      {
        id: 'saveFile',
        label: 'Save File',
        keybinding: 'Ctrl+S',
        handler: () => EditorPane.saveActiveTab?.(),
      },
      {
        id: 'closeTab',
        label: 'Close Tab',
        keybinding: 'Ctrl+W',
        handler: () => EditorPane.closeActiveTab?.(),
      },
      {
        id: 'splitEditor',
        label: 'Split Editor Right',
        keybinding: 'Ctrl+\\',
        handler: () => EditorPane.splitEditor?.(),
      },
      {
        id: 'goToLine',
        label: 'Go to Line...',
        keybinding: 'Ctrl+G',
        handler: () => {
          const line = prompt('Go to Line:');
          if (line) {
            const num = parseInt(line, 10);
            if (!isNaN(num) && num > 0) {
              EditorPane.goToLine?.(num);
            }
          }
        },
      },
      {
        id: 'toggleTerminal',
        label: 'Toggle Terminal',
        keybinding: 'Ctrl+`',
        handler: () => togglePanel(),
      },
      {
        id: 'newTerminal',
        label: 'New Terminal',
        handler: () => newTerm(),
      },
      {
        id: 'quickOpen',
        label: 'Quick Open File',
        keybinding: 'Ctrl+P',
        handler: () => setQuickOpenVisible(true),
      },
      {
        id: 'keyboardShortcuts',
        label: 'Keyboard Shortcuts',
        keybinding: 'Ctrl+K',
        handler: () => setShortcutsVisible(prev => !prev),
      },
    ]);
  });

  return (
    <SettingsProvider rootPath={rootPath}>
      <GitProvider rootPath={rootPath}>
        <div class="app-shell">
          <div class="app-main">
            <ActivityBar activeView={activeView} onViewChange={setActiveView} />
            <Sidebar activeView={activeView} rootPath={rootPath} />
            <div class="editor-area">
              <TabBar />
              <Breadcrumbs />
              <EditorPane />
            </div>
          </div>
          <TerminalPanel />
          <StatusBar />
          <CommandPalette />
          <Show when={shortcutsVisible()}>
            <KeyboardShortcutsPanel onClose={() => setShortcutsVisible(false)} />
          </Show>
          <QuickFileOpen isOpen={quickOpenVisible} onClose={() => setQuickOpenVisible(false)} rootPath={rootPath} />
        </div>
      </GitProvider>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <TerminalProvider>
        <CommandProvider>
          <AppInner />
        </CommandProvider>
      </TerminalProvider>
    </EditorProvider>
  );
}
