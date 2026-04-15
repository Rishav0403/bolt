import React, { createContext, useContext, useState, useCallback } from 'react';

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const openFile = useCallback((path, name, content) => {
    setTabs(prev => {
      const existing = prev.find(t => t.path === path);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const id = path;
      const newTab = {
        id,
        path,
        name,
        content: content || '',
        originalContent: content || '',
        isModified: false,
        language: getLanguageFromPath(path),
      };
      setActiveTabId(id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const newTabs = prev.filter(t => t.id !== id);
      if (id === activeTabId && newTabs.length > 0) {
        const newIdx = Math.min(idx, newTabs.length - 1);
        setActiveTabId(newTabs[newIdx].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const updateTabContent = useCallback((id, content) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, content, isModified: content !== t.originalContent };
    }));
  }, []);

  const markTabSaved = useCallback((id, content) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, content, originalContent: content, isModified: false };
    }));
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId) || null;

  return (
    <EditorContext.Provider value={{
      tabs,
      activeTabId,
      activeTab,
      setActiveTabId,
      openFile,
      closeTab,
      updateTabContent,
      markTabSaved,
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

function getLanguageFromPath(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    go: 'go', py: 'python', rs: 'rust', rb: 'ruby',
    java: 'java', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    md: 'markdown', xml: 'xml', sql: 'sql', sh: 'shell',
    dockerfile: 'dockerfile', makefile: 'makefile',
    mod: 'go', sum: 'plaintext', txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

export default EditorContext;
