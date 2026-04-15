import { createEffect, onMount, onCleanup } from 'solid-js';
import * as monaco from 'monaco-editor';
import { useEditor } from '../contexts/EditorContext';
import { getWailsFs } from '../utils/wails';

// Configure Monaco workers via import.meta.url (Vite handles bundling)
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    return new Worker(
      new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
      { type: 'module' }
    );
  },
};

export default function EditorPane() {
  const { activeTab, updateTabContent, closeTab, markTabSaved, syncModifiedFlag, getTabContent } = useEditor();

  let containerRef;
  let editorInstance = null;
  let debounceTimer = null;
  // Track which tab the editor is currently showing to avoid cross-tab content corruption
  let currentTabId = null;

  function createOrSwitchModel(tab) {
    if (!editorInstance || !tab) return;

    const tabId = tab.id;
    if (currentTabId === tabId) return;
    currentTabId = tabId;

    const uri = monaco.Uri.parse(`file://${tab.path}`);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      const content = getTabContent(tabId) ?? tab.originalContent ?? '';
      model = monaco.editor.createModel(content, tab.language, uri);
    }

    editorInstance.setModel(model);
    editorInstance.focus();
  }

  onMount(() => {
    editorInstance = monaco.editor.create(containerRef, {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      wordWrap: 'off',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      padding: { top: 8 },
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });

    // Listen for content changes -- guard against cross-tab corruption during model switches
    editorInstance.onDidChangeModelContent(() => {
      if (!currentTabId) return;
      const tab = activeTab();
      if (!tab || tab.id !== currentTabId) return;

      const value = editorInstance.getValue();
      updateTabContent(tab.id, value);

      if (debounceTimer) clearTimeout(debounceTimer);
      const id = tab.id;
      debounceTimer = setTimeout(() => {
        syncModifiedFlag(id);
      }, 300);
    });

    // If there's already an active tab, show it
    const tab = activeTab();
    if (tab) {
      createOrSwitchModel(tab);
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);
  });

  // React to active tab changes
  createEffect(() => {
    const tab = activeTab();
    if (tab) {
      createOrSwitchModel(tab);
    } else {
      // No active tab -- clear the editor model
      if (editorInstance) {
        editorInstance.setModel(null);
      }
      currentTabId = null;
    }
  });

  function handleKeyDown(e) {
    // Save: Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      const tab = activeTab();
      if (!tab) return;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      const content = getTabContent(tab.id) ?? '';
      const fs = getWailsFs();
      if (fs) {
        fs.WriteFile(tab.path, content)
          .then(() => markTabSaved(tab.id, content))
          .catch(err => console.error('Failed to save file:', err));
      } else {
        markTabSaved(tab.id, content);
      }
    }

    // Close tab: Ctrl+W
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      const tab = activeTab();
      if (tab) {
        const uri = monaco.Uri.parse(`file://${tab.path}`);
        const model = monaco.editor.getModel(uri);
        if (model) model.dispose();
        currentTabId = null;
        closeTab(tab.id);
      }
    }
  }

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (editorInstance) {
      editorInstance.dispose();
      editorInstance = null;
    }
    monaco.editor.getModels().forEach(m => m.dispose());
  });

  // Always render both the welcome screen and the editor container.
  // Toggle visibility via CSS so the Monaco instance is never destroyed.
  return (
    <>
      <div class="editor-pane-empty" style={{ display: activeTab() ? 'none' : 'flex' }}>
        <div class="editor-welcome">
          <div class="editor-welcome-logo">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.2">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
          <h2>Bolt Editor</h2>
          <div class="editor-welcome-shortcuts">
            <div class="shortcut-row">
              <span class="shortcut-label">Open Folder</span>
              <kbd>Ctrl+O</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-label">Command Palette</span>
              <kbd>Ctrl+Shift+P</kbd>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-label">Toggle Sidebar</span>
              <kbd>Ctrl+B</kbd>
            </div>
          </div>
        </div>
      </div>
      <div
        class="editor-pane"
        style={{ flex: '1', overflow: 'hidden', display: activeTab() ? 'flex' : 'none' }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
}
