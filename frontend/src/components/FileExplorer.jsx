import React, { useState, useEffect, useCallback } from 'react';
import TreeNode from './TreeNode';
import { useEditor } from '../contexts/EditorContext';

// Demo file tree for browser preview (when Wails backend isn't available)
const DEMO_TREE = [
  {
    name: 'src',
    path: '/demo/src',
    isDir: true,
    extension: '',
    children: [
      {
        name: 'components',
        path: '/demo/src/components',
        isDir: true,
        extension: '',
        children: [
          { name: 'App.jsx', path: '/demo/src/components/App.jsx', isDir: false, extension: 'jsx' },
          { name: 'Header.jsx', path: '/demo/src/components/Header.jsx', isDir: false, extension: 'jsx' },
          { name: 'Sidebar.jsx', path: '/demo/src/components/Sidebar.jsx', isDir: false, extension: 'jsx' },
        ],
      },
      {
        name: 'utils',
        path: '/demo/src/utils',
        isDir: true,
        extension: '',
        children: [
          { name: 'helpers.ts', path: '/demo/src/utils/helpers.ts', isDir: false, extension: 'ts' },
          { name: 'api.ts', path: '/demo/src/utils/api.ts', isDir: false, extension: 'ts' },
        ],
      },
      { name: 'main.tsx', path: '/demo/src/main.tsx', isDir: false, extension: 'tsx' },
      { name: 'style.css', path: '/demo/src/style.css', isDir: false, extension: 'css' },
    ],
  },
  {
    name: 'backend',
    path: '/demo/backend',
    isDir: true,
    extension: '',
    children: [
      { name: 'main.go', path: '/demo/backend/main.go', isDir: false, extension: 'go' },
      { name: 'server.go', path: '/demo/backend/server.go', isDir: false, extension: 'go' },
      { name: 'handler.py', path: '/demo/backend/handler.py', isDir: false, extension: 'py' },
    ],
  },
  { name: 'package.json', path: '/demo/package.json', isDir: false, extension: 'json' },
  { name: 'README.md', path: '/demo/README.md', isDir: false, extension: 'md' },
  { name: 'Makefile', path: '/demo/Makefile', isDir: false, extension: '' },
  { name: 'go.mod', path: '/demo/go.mod', isDir: false, extension: 'mod' },
];

// Demo file contents for browser preview
const DEMO_CONTENTS = {
  '/demo/src/components/App.jsx': `import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function App() {
  return (
    <div className="app">
      <Header title="Bolt Editor" />
      <div className="main">
        <Sidebar />
        <main className="content">
          <h1>Welcome to Bolt</h1>
          <p>A blazing-fast code editor built with Wails + React</p>
        </main>
      </div>
    </div>
  );
}`,
  '/demo/src/components/Header.jsx': `import React from 'react';

export default function Header({ title }) {
  return (
    <header className="header">
      <h1>{title}</h1>
      <nav>
        <button>File</button>
        <button>Edit</button>
        <button>View</button>
        <button>Help</button>
      </nav>
    </header>
  );
}`,
  '/demo/src/components/Sidebar.jsx': `import React, { useState } from 'react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={\`sidebar \${collapsed ? 'collapsed' : ''}\`}>
      <button onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '>' : '<'}
      </button>
      {!collapsed && (
        <ul>
          <li>Explorer</li>
          <li>Search</li>
          <li>Git</li>
          <li>Extensions</li>
        </ul>
      )}
    </aside>
  );
}`,
  '/demo/src/utils/helpers.ts': `export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}`,
  '/demo/src/utils/api.ts': `const BASE_URL = 'https://api.example.com';

export async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(\`\${BASE_URL}\${path}\`);
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json();
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(\`\${BASE_URL}\${path}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}`,
  '/demo/src/main.tsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './style.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  '/demo/src/style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #1e1e1e;
  color: #cccccc;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}`,
  '/demo/backend/main.go': `package main

import (
\t"fmt"
\t"log"
\t"net/http"
)

func main() {
\tmux := http.NewServeMux()
\tmux.HandleFunc("/api/health", healthHandler)
\tmux.HandleFunc("/api/files", filesHandler)

\tfmt.Println("Server starting on :8080")
\tlog.Fatal(http.ListenAndServe(":8080", mux))
}`,
  '/demo/backend/server.go': `package main

import (
\t"encoding/json"
\t"net/http"
)

type Response struct {
\tStatus  string      \`json:"status"\`
\tData    interface{} \`json:"data,omitempty"\`
\tMessage string      \`json:"message,omitempty"\`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
\tw.Header().Set("Content-Type", "application/json")
\tjson.NewEncoder(w).Encode(Response{
\t\tStatus: "ok",
\t\tData:   map[string]string{"version": "1.0.0"},
\t})
}

func filesHandler(w http.ResponseWriter, r *http.Request) {
\tw.Header().Set("Content-Type", "application/json")
\tjson.NewEncoder(w).Encode(Response{
\t\tStatus: "ok",
\t\tData:   []string{"main.go", "server.go"},
\t})
}`,
  '/demo/backend/handler.py': `from typing import Any
from dataclasses import dataclass


@dataclass
class FileInfo:
    name: str
    path: str
    size: int
    is_dir: bool


def list_files(directory: str) -> list[FileInfo]:
    """List all files in a directory."""
    import os
    
    result = []
    for entry in os.scandir(directory):
        info = FileInfo(
            name=entry.name,
            path=entry.path,
            size=entry.stat().st_size,
            is_dir=entry.is_dir(),
        )
        result.append(info)
    
    return sorted(result, key=lambda f: (not f.is_dir, f.name.lower()))


if __name__ == "__main__":
    files = list_files(".")
    for f in files:
        print(f"{f.name:30s} {'DIR' if f.is_dir else f'{f.size:>8d} bytes'}")`,
  '/demo/package.json': `{
  "name": "bolt-editor",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "monaco-editor": "^0.45.0",
    "@monaco-editor/react": "^4.6.0"
  }
}`,
  '/demo/README.md': `# Bolt Editor

A blazing-fast, VS Code-inspired desktop code editor built with:

- **Wails v2** — Go backend with native webview (no Electron!)
- **React** — UI framework
- **Monaco Editor** — The same editor engine that powers VS Code
- **Go** — Backend for file system, LSP, git, and more

## Features

- Multi-tab editor with syntax highlighting
- File explorer with tree view
- Command palette (Ctrl+Shift+P)
- Cross-platform (macOS, Linux, Windows)
- ~80% smaller than VS Code (~8MB vs ~350MB)
- ~60-70% less RAM usage

## Building

\`\`\`bash
# Linux
make build-linux

# macOS
make build-darwin

# Windows
make build-windows
\`\`\`

## Development

\`\`\`bash
wails dev -tags webkit2_41
\`\`\``,
  '/demo/Makefile': `.PHONY: build-linux build-darwin build-windows dev clean

build-linux:
\twails build -tags webkit2_41

build-darwin:
\twails build

build-windows:
\twails build

dev:
\twails dev -tags webkit2_41

clean:
\trm -rf build/bin`,
  '/demo/go.mod': `module bolt

go 1.22.0

require (
\tgithub.com/wailsapp/wails/v2 v2.12.0
\tgithub.com/fsnotify/fsnotify v1.7.0
)`,
};

export default function FileExplorer({ rootPath }) {
  const [tree, setTree] = useState([]);
  const [projectName, setProjectName] = useState('');
  const { openFile } = useEditor();

  const isWails = typeof window !== 'undefined' && window.go?.fs?.Service;

  const loadTree = useCallback(async () => {
    if (isWails && rootPath) {
      try {
        const result = await window.go.fs.Service.ListDir(rootPath);
        setTree(result || []);
        setProjectName(rootPath.split('/').pop() || rootPath);
      } catch (err) {
        console.error('Failed to load directory:', err);
      }
    } else {
      // Demo mode for browser preview
      setTree(DEMO_TREE);
      setProjectName('bolt-editor');
    }
  }, [rootPath, isWails]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleFileClick = useCallback(async (entry) => {
    if (isWails) {
      try {
        const content = await window.go.fs.Service.ReadFile(entry.path);
        openFile(entry.path, entry.name, content);
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    } else {
      // Demo mode
      const content = DEMO_CONTENTS[entry.path] || `// ${entry.name}\n// File content would be loaded from disk in the desktop app`;
      openFile(entry.path, entry.name, content);
    }
  }, [isWails, openFile]);

  return (
    <div className="file-explorer">
      {projectName && (
        <div className="file-explorer-project">
          <span className="file-explorer-project-name truncate">{projectName.toUpperCase()}</span>
        </div>
      )}
      <div className="file-explorer-tree">
        {tree.map(entry => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileClick={handleFileClick}
            onRefreshDir={loadTree}
          />
        ))}
      </div>

      <style>{`
        .file-explorer {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .file-explorer-project {
          display: flex;
          align-items: center;
          height: 22px;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          cursor: pointer;
        }

        .file-explorer-project:hover {
          background: var(--bg-hover);
        }

        .file-explorer-tree {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 2px 0;
        }
      `}</style>
    </div>
  );
}
