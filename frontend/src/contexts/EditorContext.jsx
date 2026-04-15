import { createContext, useContext, createSignal, createMemo } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

const EditorContext = createContext();

export function EditorProvider(props) {
  const [tabs, setTabs] = createStore([]);
  const [activeTabId, setActiveTabId] = createSignal(null);

  // Ref-based content store: avoids triggering reactivity on every keystroke.
  // Keys are tab IDs, values are the latest editor content strings.
  const contentMap = {};

  const activeTab = createMemo(() => {
    const id = activeTabId();
    if (!id) return null;
    return tabs.find(t => t.id === id) || null;
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
    // After removal, always reconcile activeTabId:
    // - if the closed tab was active, pick a neighbor
    // - if the closed tab was the one activeTabId points to (same check), clear it
    // - if tabs is now empty, clear it
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

function getLanguageFromPath(path) {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const name = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

  const nameLower = name.toLowerCase();
  const knownNames = { makefile: 'makefile', dockerfile: 'dockerfile' };
  if (knownNames[nameLower]) return knownNames[nameLower];

  const dotIdx = name.lastIndexOf('.');
  if (dotIdx <= 0) return 'plaintext';
  const ext = name.substring(dotIdx + 1).toLowerCase();

  const extToLang = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    go: 'go', py: 'python', rs: 'rust', rb: 'ruby',
    java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    md: 'markdown', xml: 'xml', sql: 'sql', sh: 'shell',
    mod: 'go', sum: 'plaintext', txt: 'plaintext',
  };
  return extToLang[ext] || 'plaintext';
}

export default EditorContext;
