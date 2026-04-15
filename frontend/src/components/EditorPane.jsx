import React, { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor } from '../contexts/EditorContext';
import { isWailsEnv, getWailsFs } from '../utils/wails';

export default function EditorPane() {
  const { activeTab, updateTabContent, closeTab, markTabSaved } = useEditor();
  const editorRef = useRef(null);

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  const handleChange = useCallback((value) => {
    if (activeTab && value !== undefined) {
      updateTabContent(activeTab.id, value);
    }
  }, [activeTab, updateTabContent]);

  // Save handler: Ctrl+S
  useEffect(() => {
    const handler = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!activeTab) return;

        const fs = getWailsFs();
        if (fs) {
          try {
            await fs.WriteFile(activeTab.path, activeTab.content);
            markTabSaved(activeTab.id, activeTab.content);
          } catch (err) {
            console.error('Failed to save file:', err);
          }
        } else {
          // In browser dev mode, just mark as saved
          markTabSaved(activeTab.id, activeTab.content);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, markTabSaved]);

  // Close tab: Ctrl+W
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTab) {
          closeTab(activeTab.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, closeTab]);

  if (!activeTab) {
    return (
      <div className="editor-pane-empty">
        <div className="editor-welcome">
          <div className="editor-welcome-logo">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
          <h2>Bolt Editor</h2>
          <div className="editor-welcome-shortcuts">
            <div className="shortcut-row">
              <span className="shortcut-label">Open Folder</span>
              <kbd>Ctrl+O</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-label">Command Palette</span>
              <kbd>Ctrl+Shift+P</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-label">Toggle Sidebar</span>
              <kbd>Ctrl+B</kbd>
            </div>
          </div>
        </div>

        <style>{`
          .editor-pane-empty {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }

          .editor-welcome {
            text-align: center;
            color: var(--text-muted);
          }

          .editor-welcome-logo {
            margin-bottom: 16px;
          }

          .editor-welcome h2 {
            font-size: 20px;
            font-weight: 300;
            color: var(--text-secondary);
            margin-bottom: 24px;
          }

          .editor-welcome-shortcuts {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .shortcut-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            font-size: 13px;
          }

          .shortcut-label {
            color: var(--text-secondary);
          }

          kbd {
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 3px;
            padding: 2px 6px;
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="editor-pane" style={{ flex: 1, overflow: 'hidden' }}>
      <Editor
        key={activeTab.id}
        height="100%"
        language={activeTab.language}
        value={activeTab.content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
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
        }}
      />
    </div>
  );
}
