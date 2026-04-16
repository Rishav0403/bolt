import { createContext, useContext, createSignal, createMemo, untrack } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { getLanguageFromPath } from '../utils/fileIcons';

const EditorContext = createContext();

export function EditorProvider(props) {
  const [tabs, setTabs] = createStore([]);
  const [activeTabId, setActiveTabId] = createSignal(null);
  const [cursorPosition, setCursorPosition] = createSignal({ line: 1, column: 1, selected: 0 });

  // Split pane management
  const [panes, setPanes] = createSignal([
    { id: 'pane-0', tabIds: [], activeTabId: null }
  ]);
  const [activePaneIndex, setActivePaneIndex] = createSignal(0);

  function splitPane() {
    setPanes(prev => {
      const newId = 'pane-' + prev.length;
      return [...prev, { id: newId, tabIds: [], activeTabId: null }];
    });
    setActivePaneIndex(prev => prev + 1);
  }

  function closePane(index) {
    setPanes(prev => {
      if (prev.length <= 1) return prev; // can't close last pane
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setActivePaneIndex(prev => Math.min(prev, panes().length - 2));
  }

  function getActivePane() {
    return panes()[activePaneIndex()] || panes()[0];
  }

  // Ref-based content store: avoids triggering reactivity on every keystroke.
  // Keys are tab IDs, values are the latest editor content strings.
  const contentMap = {};

  const activeTab = createMemo(() => {
    const id = activeTabId();
    if (!id) return null;
    // Track only activeTabId and tabs.length. Use untrack for the .find()
    // so property reads on individual tabs (isModified from syncModifiedFlag)
    // don't cause this memo to re-compute -- critical for typing performance.
    const _len = tabs.length;
    return untrack(() => tabs.find(t => t.id === id)) || null;
  });

  function openFile(path, name, content) {
    const existing = tabs.find(t => t.path === path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const id = path;
    const c = content || '';
    contentMap[id] = c;
    setTabs(produce(prev => {
      prev.push({
        id,
        path,
        name,
        originalContent: c,
        isModified: false,
        language: getLanguageFromPath(path),
      });
    }));
    setActiveTabId(id);
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    delete contentMap[id];
    setTabs(produce(prev => { prev.splice(idx, 1); }));
    // After removal, if the closed tab was active pick a neighbor; if empty, clear.
    if (id === activeTabId() || tabs.length === 0) {
      if (tabs.length > 0) {
        const newIdx = Math.min(idx, tabs.length - 1);
        setActiveTabId(tabs[newIdx].id);
      } else {
        setActiveTabId(null);
      }
    }
  }

  // Called on every keystroke -- only updates the plain object, no reactivity.
  function updateTabContent(id, content) {
    contentMap[id] = content;
  }

  // Called to sync the modified indicator into the store (debounced from EditorPane).
  function syncModifiedFlag(id) {
    const content = contentMap[id];
    if (content === undefined) return;
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const isModified = content !== tabs[idx].originalContent;
    if (tabs[idx].isModified !== isModified) {
      setTabs(idx, 'isModified', isModified);
    }
  }

  // Returns the current content for a tab from the plain object (no reactivity).
  function getTabContent(id) {
    return contentMap[id];
  }

  function markTabSaved(id, content) {
    contentMap[id] = content;
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    setTabs(idx, { originalContent: content, isModified: false });
  }

  const value = {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openFile,
    closeTab,
    updateTabContent,
    syncModifiedFlag,
    getTabContent,
    markTabSaved,
    cursorPosition,
    setCursorPosition,
    panes,
    activePaneIndex,
    setActivePaneIndex,
    splitPane,
    closePane,
    getActivePane,
  };

  return (
    <EditorContext.Provider value={value}>
      {props.children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
