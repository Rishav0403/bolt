### Summary
Replace all existing code in the repo with a new Wails v2 + Svelte 4 + Monaco Editor project called "Bolt" -- a VS Code-inspired desktop code editor. Phase 1 delivers: project bootstrap, Monaco editor with multi-tab support, file explorer sidebar with tree view, command palette with fuzzy search, and a polished app shell (sidebar, panels, status bar). The Go backend handles file system operations; the Svelte frontend renders the editor chrome. Svelte is chosen over SolidJS because Wails has an official Svelte template, simplifying bootstrapping.

**Critical build note:** Ubuntu 24.04 ships webkit2gtk-4.1 (not 4.0). All `wails build` and `wails dev` commands must use `-tags webkit2_41`. This has been validated -- a test build produced a 7.8MB binary successfully.

### Tasks

1. **Clear repo and bootstrap Wails project** [parallel]
   - Delete all existing files except `.git/`
   - Run `wails init -n bolt -t svelte` to scaffold the project
   - Restructure: move Go backend code into `backend/` packages
   - Update `go.mod` module name to `bolt`
   - Add Go dependency: `github.com/fsnotify/fsnotify`
   - Configure `wails.json`: set `frontend:install`, `frontend:build`, `frontend:dev:watcher`
   - Add `webkit2_41` build tag to build scripts
   - Verify: `wails build -tags webkit2_41` compiles

2. **Go backend: File System service** [after 1]
   - Create `backend/fs/service.go` with Wails-bound methods:
     - `ListDir(path string) ([]FileEntry, error)` -- recursive directory tree
     - `ReadFile(path string) (string, error)` -- read file contents
     - `WriteFile(path, content string) error` -- write/save file
     - `CreateFile(path string) error` / `CreateDir(path string) error`
     - `DeletePath(path string) error`
     - `RenamePath(oldPath, newPath string) error`
     - `OpenFolderDialog() string` -- uses Wails runtime dialog
   - Create `backend/fs/types.go`:
     - `FileEntry{Name, Path, IsDir, Extension, Children []FileEntry}`
   - Unit tests in `backend/fs/service_test.go`
   - Wire into `main.go` Bind list

3. **Go backend: App lifecycle and window management** [after 1]
   - Update `app.go`: startup/shutdown hooks, store context
   - Create `backend/settings/service.go`:
     - `GetSettings() Settings` / `UpdateSetting(key, value string) error`
     - Settings struct: Theme, FontSize, FontFamily, TabSize, WordWrap, Minimap
     - Persist to `~/.config/bolt/settings.json`
   - Unit tests in `backend/settings/service_test.go`
   - Wire into `main.go` Bind list

4. **Frontend: Svelte app shell layout** [after 1]
   - Replace default Svelte template with editor shell layout
   - Components:
     - `App.svelte` -- root layout (activity bar + sidebar + editor + status bar)
     - `ActivityBar.svelte` -- vertical icon strip (Explorer, Search, Git, Extensions icons)
     - `Sidebar.svelte` -- resizable left panel container
     - `StatusBar.svelte` -- bottom bar (file name, line:col, language, encoding)
   - CSS: dark theme via CSS custom properties, VS Code-like color scheme
   - Global styles in `src/style.css`

5. **Frontend: Monaco Editor with multi-tab support** [after 4]
   - Install npm packages: `monaco-editor`
   - Components:
     - `TabBar.svelte` -- horizontal tab strip with active/modified indicators
     - `EditorPane.svelte` -- Monaco instance, manages ITextModel per tab
   - Svelte store `editorStore.js`:
     - `openTabs[]`, `activeTabId`, `openFile(path)`, `closeTab(id)`, `setActiveTab(id)`
   - Wire to Go backend: `ReadFile` on open, `WriteFile` on Ctrl+S
   - Keybindings: Ctrl+S (save), Ctrl+W (close tab), Ctrl+Tab (next tab)
   - Monaco config: dark theme, line numbers, minimap enabled

6. **Frontend: File Explorer tree view** [after 2, 4]
   - Components:
     - `FileExplorer.svelte` -- calls Go `ListDir`, renders tree
     - `TreeNode.svelte` -- recursive component for files/folders
   - Features: expand/collapse dirs, click to open file in editor
   - File icons: CSS classes based on file extension (js, ts, go, py, html, css, json, md, etc.)
   - Context menu: New File, New Folder, Rename, Delete (calls Go backend methods)

7. **Frontend: Command Palette** [after 4, 5]
   - Component: `CommandPalette.svelte` -- overlay modal
   - Trigger: Ctrl+Shift+P (global keydown listener)
   - Fuzzy search using simple substring/scoring algorithm
   - Built-in commands: Open Folder, Save File, Close Tab, Toggle Sidebar, Toggle Minimap
   - Keyboard nav: arrow keys, Enter to execute, Escape to close
   - Svelte store `commandStore.js` for command registry

### Testing
- **Task 1:** `wails build -tags webkit2_41` compiles to binary
- **Task 2:** Go unit tests for ListDir (create temp dir tree, verify output), ReadFile, WriteFile
- **Task 3:** Go unit tests for settings load/save/update
- **Task 4-7:** Frontend builds without errors (`npm run build`); full build produces working binary
- **Integration:** Open folder dialog -> browse tree -> open file -> edit -> save -> verify file on disk

### Files to Modify
All existing files deleted. New structure:
```
bolt/
├── main.go                          -- Wails app entry, embeds frontend, binds services
├── app.go                           -- App struct, lifecycle hooks
├── wails.json                       -- Wails config
├── go.mod / go.sum                  -- Go module (module bolt)
├── Makefile                         -- Build commands with webkit2_41 tag
├── README.md                        -- Project overview
├── backend/
│   ├── fs/
│   │   ├── service.go               -- File system operations
│   │   ├── types.go                 -- FileEntry type
│   │   └── service_test.go          -- Unit tests
│   └── settings/
│       ├── service.go               -- Settings CRUD
│       └── service_test.go          -- Unit tests
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js                  -- Svelte mount
│       ├── style.css                -- Global styles, CSS variables
│       ├── App.svelte               -- Root layout
│       ├── stores/
│       │   ├── editorStore.js       -- Tab/editor state
│       │   └── commandStore.js      -- Command registry
│       └── components/
│           ├── ActivityBar.svelte
│           ├── Sidebar.svelte
│           ├── StatusBar.svelte
│           ├── TabBar.svelte
│           ├── EditorPane.svelte
│           ├── FileExplorer.svelte
│           ├── TreeNode.svelte
│           └── CommandPalette.svelte
└── build/                           -- Wails build artifacts (auto-generated)
```
