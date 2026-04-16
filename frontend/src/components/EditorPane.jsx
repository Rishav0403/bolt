import { createEffect, onMount, onCleanup, untrack, Show, For } from 'solid-js';
import * as monaco from 'monaco-editor';
import { useEditor } from '../contexts/EditorContext';
import { useSettings } from '../contexts/SettingsContext';
import { getWailsFs, getWailsTextBuffer } from '../utils/wails';

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
  const { tabs, activeTab, updateTabContent, closeTab, markTabSaved, syncModifiedFlag, getTabContent, setCursorPosition, splitPane, panes, activePaneIndex, setActivePaneIndex, closePane } = useEditor();
  const { settings } = useSettings();

  let containerRef;
  let editorInstance = null;
  let debounceTimer = null;
  // Track which tab the editor is currently showing to avoid cross-tab content corruption
  let currentTabId = null;
  // Content snapshot taken before each onDidChangeModelContent fires.
  // rangeOffset in Monaco change events is relative to the pre-change content,
  // so we need this to correctly convert UTF-16 char offsets → UTF-8 byte offsets.
  let preChangeContent = '';

  function createOrSwitchModel(tabId, tabPath, tabLanguage, originalContent) {
    if (!editorInstance || !tabId) return;
    if (currentTabId === tabId) return;
    currentTabId = tabId;

    const uri = monaco.Uri.parse(`file://${tabPath}`);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      const content = getTabContent(tabId) ?? originalContent ?? '';
      model = monaco.editor.createModel(content, tabLanguage, uri);
      // Seed the Go piece table and the pre-change snapshot with the same content.
      preChangeContent = content;
      getWailsTextBuffer()?.OpenBuffer(tabPath, content);
    } else {
      // Switching back to an already-open model — resync the snapshot.
      preChangeContent = model.getValue();
    }

    editorInstance.setModel(model);
    editorInstance.focus();
  }

  /**
   * Save the active tab. Exposed via saveActiveTab so App.jsx can
   * register it as a command in CommandContext (Ctrl+S).
   */
  function saveActiveTab() {
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

  /**
   * Close the active tab, disposing its Monaco model.
   * Exposed via closeActiveTab so App.jsx can register it as a
   * command in CommandContext (Ctrl+W).
   */
  function closeActiveTab() {
    const tab = activeTab();
    if (!tab) return;
    const uri = monaco.Uri.parse(`file://${tab.path}`);
    const model = monaco.editor.getModel(uri);
    if (model) model.dispose();
    // Free the Go-side piece table for this file.
    getWailsTextBuffer()?.CloseBuffer(tab.path);
    currentTabId = null;
    closeTab(tab.id);
  }

  function goToLine(lineNumber) {
    if (!editorInstance) return;
    editorInstance.revealLineInCenter(lineNumber);
    editorInstance.setPosition({ lineNumber, column: 1 });
    editorInstance.focus();
  }

  // Expose imperative handles so App can wire them into CommandContext
  EditorPane.saveActiveTab = saveActiveTab;
  EditorPane.closeActiveTab = closeActiveTab;
  EditorPane.goToLine = goToLine;
  EditorPane.splitEditor = null; // Will be set after mount

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
      cursorBlinking: 'blink',
      cursorSmoothCaretAnimation: 'off',
      smoothScrolling: false,
      padding: { top: 8 },
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });

    // Track cursor position for the status bar
    editorInstance.onDidChangeCursorPosition((e) => {
      const pos = editorInstance.getPosition();
      const sel = editorInstance.getSelection();
      const model = editorInstance.getModel();
      let selected = 0;
      if (sel && model && !sel.isEmpty()) {
        selected = model.getValueInRange(sel).length;
      }
      setCursorPosition({
        line: pos?.lineNumber || 1,
        column: pos?.column || 1,
        selected,
      });
    });

    // Listen for content changes -- guard against cross-tab corruption during model switches
    editorInstance.onDidChangeModelContent((e) => {
      if (!currentTabId) return;
      const tab = activeTab();
      if (!tab || tab.id !== currentTabId) return;

      const value = editorInstance.getValue();
      updateTabContent(tab.id, value);

      // Mirror each atomic change into the Go piece table.
      // Monaco's rangeOffset/rangeLength are UTF-16 code-unit counts relative
      // to the pre-change content; convert to UTF-8 byte offsets for Go.
      const tb = getWailsTextBuffer();
      if (tb) {
        const encoder = new TextEncoder();
        const before = preChangeContent; // pre-change snapshot, valid for all changes in this event
        for (const change of e.changes) {
          const { rangeOffset, rangeLength, text } = change;
          const byteOffset = encoder.encode(before.slice(0, rangeOffset)).length;
          if (rangeLength > 0) {
            const byteLen = encoder.encode(before.slice(rangeOffset, rangeOffset + rangeLength)).length;
            tb.Delete(tab.path, byteOffset, byteLen);
          }
          if (text.length > 0) tb.Insert(tab.path, byteOffset, text);
        }
      }
      // Advance the snapshot for the next event.
      preChangeContent = value;

      if (debounceTimer) clearTimeout(debounceTimer);
      const id = tab.id;
      debounceTimer = setTimeout(() => {
        syncModifiedFlag(id);
      }, 300);
    });

    // Apply settings from SettingsContext to Monaco editor options.
    // This effect is created inside onMount so editorInstance is guaranteed to exist.
    createEffect(() => {
      const s = settings();
      editorInstance.updateOptions({
        fontSize: s.fontSize,
        fontFamily: s.fontFamily,
        tabSize: s.tabSize,
        wordWrap: s.wordWrap,
        minimap: { enabled: s.minimap },
        stickyScroll: { enabled: s.stickyScrollEnabled, maxLineCount: s.stickyScrollMaxLines },
      });
      if (s.theme) {
        monaco.editor.setTheme(s.theme);
      }
    });

    // Split editor support
    EditorPane.splitEditor = () => {
      splitPane();
    };

    // If there's already an active tab, show it
    const tab = activeTab();
    if (tab) {
      createOrSwitchModel(tab.id, tab.path, tab.language, tab.originalContent);
    }
  });

  // React to active tab changes -- only track tab identity, not store properties
  createEffect(() => {
    const tab = activeTab();
    if (tab) {
      // Only read tab.id in the tracked scope; read other properties inside
      // untrack to avoid re-firing when originalContent etc. change on save.
      const tabId = tab.id;
      untrack(() => {
        const t = tabs.find(t => t.id === tabId);
        if (t) createOrSwitchModel(t.id, t.path, t.language, t.originalContent);
      });
    } else {
      if (editorInstance) {
        editorInstance.setModel(null);
      }
      currentTabId = null;
    }
  });

  // Dispose orphaned Monaco models when tabs are added/removed (e.g., via TabBar close button).
  // Only track tabs.length to avoid re-firing on every store property mutation (like isModified).
  createEffect(() => {
    const _len = tabs.length; // tracked dependency: only fires on add/remove
    // Read tab paths outside tracking to avoid depending on individual tab properties
    const openUris = new Set(untrack(() => tabs.map(t => monaco.Uri.parse(`file://${t.path}`).toString())));
    for (const model of monaco.editor.getModels()) {
      if (!openUris.has(model.uri.toString())) {
        model.dispose();
      }
    }
    // If the current model was disposed, clear the tracking variable
    if (currentTabId) {
      const currentUri = monaco.Uri.parse(`file://${currentTabId}`).toString();
      if (!openUris.has(currentUri)) {
        currentTabId = null;
      }
    }
  });

  onCleanup(() => {
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
      <div class="editor-split-container" style={{ display: activeTab() ? 'flex' : 'none', flex: '1', overflow: 'hidden' }}>
        <div
          class={`editor-pane ${activePaneIndex() === 0 ? 'active-pane' : ''}`}
          style={{ flex: '1', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}
          onClick={() => setActivePaneIndex(0)}
        >
          <Show when={panes().length > 1}>
            <div class="editor-pane-header">
              <span class="editor-pane-title">{activeTab()?.name || 'Untitled'}</span>
            </div>
          </Show>
          <div ref={containerRef} style={{ width: '100%', flex: '1' }} />
        </div>
        <For each={panes().slice(1)}>
          {(pane, i) => (
            <>
              <div class="editor-split-handle" />
              <div
                class={`editor-pane ${activePaneIndex() === i() + 1 ? 'active-pane' : ''}`}
                style={{ flex: '1', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}
                onClick={() => setActivePaneIndex(i() + 1)}
              >
                <div class="editor-pane-header">
                  <span class="editor-pane-title">
                    {pane.activeTabId ? 'Split View' : 'Empty Pane'}
                  </span>
                  <button
                    class="editor-pane-close"
                    onClick={(e) => { e.stopPropagation(); closePane(i() + 1); }}
                    title="Close Pane"
                  >
                    ×
                  </button>
                </div>
                <div class="editor-pane-placeholder">
                  <span>Open a file to view it here</span>
                </div>
              </div>
            </>
          )}
        </For>
      </div>
    </>
  );
}
