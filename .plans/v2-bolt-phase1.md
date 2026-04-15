### Summary
Replace all existing code in the repo with a new Wails v2 + React + Monaco Editor project called "Bolt" -- a VS Code-inspired desktop code editor. Phase 1 delivers: project bootstrap, Monaco editor with multi-tab support, file explorer sidebar with tree view, command palette with fuzzy search, and a polished app shell (sidebar, panels, status bar). The Go backend handles file system operations with cross-platform support (macOS, Linux, Windows); the React frontend renders the editor chrome.

**Cross-platform strategy:**
- Wails v2 uses native webview on each OS (WebKit on Linux, WebView2 on Windows, WKWebView on macOS) -- no bundled Chromium
- Go backend uses `os` and `filepath` stdlib for platform-agnostic file operations
- Settings stored via `os.UserConfigDir()` (resolves to `~/.config/bolt` on Linux, `~/Library/Application Support/bolt` on macOS, `%APPDATA%/bolt` on Windows)
- Build tags: `webkit2_41` for Linux (Ubuntu 24.04+); Windows/macOS build without special tags
- Makefile with per-platform build targets

**Build note:** Ubuntu 24.04 ships webkit2gtk-4.1 (not 4.0). Linux builds must use `-tags webkit2_41`. Validated -- test build produced a 7.8MB binary.

### Tasks

1. **Clear repo and bootstrap Wails + React project** [parallel]
   - Delete all existing files except `.git/`
   - Run `wails init -n bolt -t react` to scaffold the project
   - Restructure: move Go backend code into `backend/` packages
   - Update `go.mod` module name to `bolt`
   - Add Go dependency: `github.com/fsnotify/fsnotify`
   - Install frontend deps: `monaco-editor`, `@monaco-editor/react`
   - Configure `wails.json` for React frontend
   - Create `Makefile` with cross-platform build targets (linux, darwin, windows)
   - Verify: `wails build -tags webkit2_41` compiles on Linux

2. **Go backend: File System service** [after 1]
   - Create `backend/fs/service.go` with Wails-bound methods:
     - `ListDir(path string) ([]FileEntry, error)` -- recursive directory tree using `filepath.WalkDir`
     - `ReadFile(path string) (string, error)` -- read file contents
     - `WriteFile(path, content string) error` -- write/save file
     - `CreateFile(path string) error` / `CreateDir(path string) error`
     - `DeletePath(path string) error`
     - `RenamePath(oldPath, newPath string) error`
     - `OpenFolderDialog() string` -- uses Wails runtime dialog (cross-platform native)
   - Create `backend/fs/types.go`:
     - `FileEntry{Name, Path, IsDir, Extension, Children []FileEntry}`
   - All paths handled via `filepath.Clean` / `filepath.Join` for cross-platform safety
   - Unit tests in `backend/fs/service_test.go`
   - Wire into `main.go` Bind list

3. **Go backend: App lifecycle and settings** [after 1]
   - Update `app.go`: startup/shutdown hooks, store context
   - Create `backend/settings/service.go`:
     - `GetSettings() Settings` / `UpdateSetting(key, value string) error`
     - Settings struct: Theme, FontSize, FontFamily, TabSize, WordWrap, Minimap
     - Config dir via `os.UserConfigDir()` + `/bolt/settings.json` (cross-platform)
   - Unit tests in `backend/settings/service_test.go`
   - Wire into `main.go` Bind list

4. **Frontend: React app shell layout** [after 1]
   - Replace default React template with editor shell layout
   - Components:
     - `App.jsx` -- root layout (activity bar + sidebar + editor area + status bar)
     - `ActivityBar.jsx` -- vertical icon strip (Explorer, Search, Git, Extensions icons)
     - `Sidebar.jsx` -- resizable left panel container
     - `StatusBar.jsx` -- bottom bar (file name, line:col, language, encoding)
   - CSS: dark theme via CSS custom properties, VS Code-like color scheme
   - Global styles in `src/style.css`

5. **Frontend: Monaco Editor with multi-tab support** [after 4]
   - Use `@monaco-editor/react` for React integration
   - Components:
     - `TabBar.jsx` -- horizontal tab strip with active/modified indicators
     - `EditorPane.jsx` -- Monaco instance, manages models per tab
   - React context `EditorContext.jsx`:
     - `openTabs[]`, `activeTabId`, `openFile(path)`, `closeTab(id)`, `setActiveTab(id)`
   - Wire to Go backend: `ReadFile` on open, `WriteFile` on Ctrl+S
   - Keybindings: Ctrl+S (save), Ctrl+W (close tab), Ctrl+Tab (next tab)
   - Monaco config: dark theme (`vs-dark`), line numbers, minimap enabled

6. **Frontend: File Explorer tree view** [after 2, 4]
   - Components:
     - `FileExplorer.jsx` -- calls Go `ListDir`, renders tree
     - `TreeNode.jsx` -- recursive component for files/folders
   - Features: expand/collapse dirs, click to open file in editor
   - File icons: CSS classes based on file extension (js, ts, go, py, html, css, json, md, etc.)
   - Context menu: New File, New Folder, Rename, Delete (calls Go backend methods)

7. **Frontend: Command Palette** [after 4, 5]
   - Component: `CommandPalette.jsx` -- overlay modal
   - Trigger: Ctrl+Shift+P / Cmd+Shift+P (cross-platform keybinding)
   - Fuzzy search using simple substring/scoring algorithm
   - Built-in commands: Open Folder, Save File, Close Tab, Toggle Sidebar, Toggle Minimap
   - Keyboard nav: arrow keys, Enter to execute, Escape to close
   - React context `CommandContext.jsx` for command registry

### Testing
- **Task 1:** `wails build -tags webkit2_41` compiles to binary on Linux
- **Task 2:** Go unit tests for ListDir (create temp dir tree, verify output), ReadFile, WriteFile
- **Task 3:** Go unit tests for settings load/save/update
- **Task 4-7:** Frontend builds without errors (`npm run build`); full Wails build produces working binary
- **Integration:** Open folder dialog -> browse tree -> open file -> edit -> save -> verify file on disk

### Files to Modify
All existing files deleted. New structure:
```
bolt/
├── main.go                          -- Wails app entry, embeds frontend, binds services
├── app.go                           -- App struct, lifecycle hooks
├── wails.json                       -- Wails config
├── go.mod / go.sum                  -- Go module (module bolt)
├── Makefile                         -- Cross-platform build commands
├── README.md                        -- Project overview + build instructions per OS
├── backend/
│   ├── fs/
│   │   ├── service.go               -- File system operations (cross-platform)
│   │   ├── types.go                 -- FileEntry type
│   │   └── service_test.go          -- Unit tests
│   └── settings/
│       ├── service.go               -- Settings CRUD (cross-platform config dir)
│       └── service_test.go          -- Unit tests
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                 -- React mount
│       ├── style.css                -- Global styles, CSS variables
│       ├── App.jsx                  -- Root layout
│       ├── contexts/
│       │   ├── EditorContext.jsx     -- Tab/editor state
│       │   └── CommandContext.jsx    -- Command registry
│       └── components/
│           ├── ActivityBar.jsx
│           ├── Sidebar.jsx
│           ├── StatusBar.jsx
│           ├── TabBar.jsx
│           ├── EditorPane.jsx
│           ├── FileExplorer.jsx
│           ├── TreeNode.jsx
│           └── CommandPalette.jsx
└── build/                           -- Wails build artifacts (auto-generated)
```
