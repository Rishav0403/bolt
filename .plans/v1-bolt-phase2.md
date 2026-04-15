### Summary

Phase 2 adds four major features to the Bolt Editor: an integrated terminal (PTY via `creack/pty` + xterm.js), project-wide search (ripgrep shell-out + virtual-scrolled results UI), workspace & settings system (multi-root workspaces, 3-tier settings precedence, searchable settings UI), and minimap/breadcrumbs (Monaco built-ins + breadcrumb bar with symbol outline). The Go backend gets three new services (`backend/terminal/`, `backend/search/`, extended `backend/settings/`), and the frontend gets four new components plus significant extensions to existing ones.

### Tasks

**1. Terminal backend — Go PTY service** [parallel]
- Create `backend/terminal/service.go` with a `Service` struct managing multiple terminal instances (map of session ID → PTY)
- Use `github.com/creack/pty` to spawn shells via `pty.Start(exec.Command(shell))`
- Shell detection: check `$SHELL` env var, fall back to `/bin/bash`, `/bin/sh` (Linux/macOS) or `powershell.exe` (Windows)
- Store Wails app context (passed via `SetContext()` like `fs.Service`) for event emission
- Methods exposed to frontend via Wails bindings:
  - `CreateTerminal(id string) error` — spawn a new PTY session, start read goroutine
  - `WriteTerminal(id string, data string) error` — write base64-decoded bytes to PTY stdin
  - `ResizeTerminal(id string, cols, rows int) error` — call `pty.Setsize()`
  - `CloseTerminal(id string) error` — send SIGHUP, close PTY fd, clean up
  - `ListTerminals() []TerminalInfo` — return active sessions
- Read goroutine: read from PTY master fd in 4KB chunks, base64-encode output, emit via `runtime.EventsEmit(ctx, "terminal:output:"+id, base64Data)`
- Handle process exit: detect EOF on read, emit `terminal:exit:` event with exit code, clean up
- Add `go get github.com/creack/pty` dependency
- Write unit tests in `backend/terminal/service_test.go`: test CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal, ListTerminals, error cases (invalid ID, double close)
- **Files:** `backend/terminal/service.go`, `backend/terminal/service_test.go`

**2. Search backend — ripgrep shell-out service** [parallel]
- Create `backend/search/service.go` with a `Service` struct
- Shell out to `rg` (ripgrep) for project-wide search — no CGo needed since `rg` is a standalone binary
- Find `rg` binary path at service init time (`exec.LookPath("rg")`); return clear error if not found
- Methods exposed to frontend via Wails bindings:
  - `Search(opts SearchOptions) ([]SearchResult, error)` — run `rg --json` with options, parse JSON output, return structured results
  - `SearchStream(opts SearchOptions) error` — run `rg --json`, stream results incrementally via `runtime.EventsEmit(ctx, "search:result", result)` and `"search:done"` when complete
  - `CancelSearch() error` — kill the running `rg` process (store `*exec.Cmd` reference)
  - `Replace(opts ReplaceOptions) (int, error)` — run `rg --files-with-matches` to find files, then do in-memory find/replace and write back (safer than `rg --replace` which only prints)
- `SearchOptions` struct: `Query string`, `RootPath string`, `IsRegex bool`, `CaseSensitive bool`, `WholeWord bool`, `IncludeGlobs []string`, `ExcludeGlobs []string`, `MaxResults int`
- `SearchResult` struct: `FilePath string`, `LineNumber int`, `Column int`, `LineText string`, `MatchText string`
- `ReplaceOptions` struct: embeds `SearchOptions` + `ReplaceText string`
- Build `rg` args from `SearchOptions`: `--json`, `--case-sensitive`/`-i`, `--word-regexp`, `--glob`, `--max-count`, etc.
- Parse `rg --json` output line by line (each line is a JSON object with `type` field: `"match"`, `"begin"`, `"end"`, `"summary"`)
- Store Wails app context for event emission (same pattern as terminal service)
- Write unit tests: test arg building, JSON output parsing, cancel behavior, error cases
- **Files:** `backend/search/service.go`, `backend/search/service_test.go`

**3. Extend settings backend — workspace settings & new fields** [parallel]
- Extend `Settings` struct with new fields:
  - `TerminalShell string` (default: `""` = auto-detect)
  - `TerminalFontSize int` (default: 13)
  - `TerminalFontFamily string` (default: same as editor)
  - `SearchExcludeGlobs []string` (default: `["**/node_modules/**", "**/.git/**", "**/dist/**"]`)
  - `BreadcrumbsEnabled bool` (default: true)
  - `StickyScrollEnabled bool` (default: true)
  - `StickyScrollMaxLines int` (default: 5)
- Add workspace settings support:
  - New method `LoadWorkspaceSettings(rootPath string) (Settings, error)` — reads `.bolt/settings.json` from workspace root
  - New method `GetMergedSettings(rootPath string) Settings` — merges default → user → workspace with workspace taking precedence
  - New method `SaveWorkspaceSettings(rootPath string, settings Settings) error` — writes `.bolt/settings.json`
  - New method `GetSettingsSchema() []SettingDescriptor` — returns metadata for all settings (key, type, default, description, enum values) for the settings UI
- `SettingDescriptor` struct: `Key string`, `Type string` (string/number/bool/array), `Default interface{}`, `Description string`, `Enum []string` (optional)
- Update `UpdateSetting` to handle new keys
- Update existing tests, add new tests for workspace merge, schema generation
- **Files:** `backend/settings/service.go`, `backend/settings/service_test.go`

**4. Wire new services into Wails** [after 1, 2, 3]
- Update `main.go`: import `backend/terminal` and `backend/search`, create service instances, add to `Bind` slice
- Update `app.go`: store terminal and search service references, pass context in `startup()` so they can emit events
- Update `frontend/src/utils/wails.js`: add `getWailsTerminal()` and `getWailsSearch()` and `getWailsSettings()` helpers
- **Files:** `main.go`, `app.go`, `frontend/src/utils/wails.js`

**5. Terminal frontend — xterm.js integration** [after 4]
- Add `xterm` and `@xterm/addon-fit` and `@xterm/addon-webgl` npm dependencies
- Create `frontend/src/components/Terminal.jsx`:
  - SolidJS component wrapping xterm.js `Terminal` instance
  - On mount: create xterm Terminal, load WebGL renderer addon + fit addon, attach to container div
  - Call `getWailsTerminal().CreateTerminal(id)` to spawn backend PTY
  - Listen for `terminal:output:{id}` events via Wails runtime, base64-decode, write to xterm
  - Listen for `terminal:exit:{id}` events, show "[Process exited]" message
  - On xterm `onData` callback: base64-encode user input, call `getWailsTerminal().WriteTerminal(id, data)`
  - On container resize: call fit addon's `fit()`, then `getWailsTerminal().ResizeTerminal(id, cols, rows)`
  - `onCleanup`: call `getWailsTerminal().CloseTerminal(id)`, dispose xterm instance
- Create `frontend/src/components/TerminalPanel.jsx`:
  - Manages multiple terminal instances (tabs along bottom)
  - Signals: `terminals` (array of `{id, title}`), `activeTerminalId`
  - "+" button to create new terminal, "x" button to close
  - Split pane support: horizontal split creates side-by-side terminal containers
  - Shell selection dropdown (populated from detected shells or settings)
- Create `frontend/src/contexts/TerminalContext.jsx`:
  - `createStore` for terminal instances
  - Methods: `createTerminal()`, `closeTerminal(id)`, `setActiveTerminal(id)`
  - Signal for panel visibility (toggle with Ctrl+`)
- Update `App.jsx`: add TerminalContext provider, add terminal panel below editor area with draggable resize handle
- Add CSS for terminal panel, terminal tabs, resize handle to `style.css`
- Register commands in `App.jsx` onMount: "Toggle Terminal" (Ctrl+`), "New Terminal", "Kill Terminal"
- **Files:** `frontend/src/components/Terminal.jsx`, `frontend/src/components/TerminalPanel.jsx`, `frontend/src/contexts/TerminalContext.jsx`, `frontend/src/App.jsx`, `frontend/src/style.css`

**6. Search frontend — sidebar panel + results UI** [after 4]
- Create `frontend/src/components/SearchPanel.jsx`:
  - Search input with debounced query (300ms)
  - Toggle buttons: regex (.*), case sensitive (Aa), whole word (ab|)
  - Include/exclude glob inputs (collapsible "files to include" / "files to exclude")
  - Replace input (collapsible, toggled by expand arrow)
  - "Replace All" button that calls `getWailsSearch().Replace(opts)`
  - Results area: grouped by file, each file expandable to show matching lines
  - Virtual scrolling for large result sets (implement simple windowed list — render only visible items based on scroll position and container height)
  - Each result line shows: line number, line text with match highlighted via `<mark>` tag
  - Click on result: call `openFile(path, name, content)` from EditorContext (read file first), then set cursor position
  - Result count badge in header ("N results in M files")
  - Loading spinner while search is running
  - "Cancel" button to abort long-running searches
- Listen for `search:result` and `search:done` Wails events for incremental results
- In demo mode (no Wails): implement simple JS-based search over `DEMO_CONTENTS` as fallback
- Update `Sidebar.jsx`: replace the search `PlaceholderView` with `SearchPanel` component, pass `rootPath` prop
- Add CSS for search panel, search inputs, result items, match highlighting to `style.css`
- **Files:** `frontend/src/components/SearchPanel.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/style.css`

**7. Workspace & Settings frontend** [after 4]
- Create `frontend/src/components/SettingsEditor.jsx`:
  - Searchable settings UI (like VS Code's settings editor)
  - Fetch schema from `getWailsSettings().GetSettingsSchema()` on mount
  - Fetch current merged settings from `getWailsSettings().GetMergedSettings(rootPath)`
  - Search input at top filters settings by key/description
  - Each setting rendered as appropriate control: text input (string), number input (number), checkbox (bool), multi-line tag input (array)
  - Show default value, current value, and scope indicator (User / Workspace)
  - On change: call `getWailsSettings().UpdateSetting(key, value)` for user settings or `getWailsSettings().SaveWorkspaceSettings(rootPath, settings)` for workspace settings
  - Tabs at top: "User Settings" / "Workspace Settings" to switch scope
- Update `Sidebar.jsx`: replace settings `PlaceholderView` with `SettingsEditor` component
- Create `frontend/src/contexts/SettingsContext.jsx`:
  - Fetches and caches merged settings on mount and when rootPath changes
  - Provides `settings()` signal and `updateSetting(key, value)` method to all components
  - EditorPane reads settings to configure Monaco (fontSize, tabSize, wordWrap, minimap, stickyScroll)
  - Terminal reads settings for shell, font size, font family
- Update `EditorPane.jsx`: read settings from SettingsContext, apply to Monaco editor options via `editorInstance.updateOptions()` in a `createEffect`
- Add CSS for settings editor to `style.css`
- **Files:** `frontend/src/components/SettingsEditor.jsx`, `frontend/src/contexts/SettingsContext.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/components/EditorPane.jsx`, `frontend/src/style.css`

**8. Minimap & Breadcrumbs** [after 7]
- Minimap: already enabled in Monaco config (`minimap: { enabled: true }`). Wire it to settings so `settings().minimap` controls `editorInstance.updateOptions({ minimap: { enabled: settings().minimap } })`. This is handled in task 7's EditorPane settings effect — no separate work needed.
- Create `frontend/src/components/Breadcrumbs.jsx`:
  - Parse active tab's file path into segments using `pathUtils.js`
  - Each segment is a clickable breadcrumb (clicking a directory segment could open file explorer to that folder — stretch goal, initially just visual)
  - Final segment: file name
  - Symbol outline: use Monaco's `getModel().getLanguageId()` and `monaco.languages.DocumentSymbolProvider` to get symbols (functions, classes) — if available for the language, show current symbol after the file path breadcrumbs
  - Listen to `editorInstance.onDidChangeCursorPosition` to update current symbol as cursor moves
  - Render between TabBar and EditorPane
  - Controlled by `settings().breadcrumbsEnabled`
- Sticky scroll: Monaco has built-in sticky scroll since v0.40. Enable via `editorInstance.updateOptions({ stickyScroll: { enabled: settings().stickyScrollEnabled, maxLineCount: settings().stickyScrollMaxLines } })` — handled in the settings effect from task 7.
- Update `App.jsx` layout: insert `<Breadcrumbs />` between `<TabBar />` and `<EditorPane />`
- Add CSS for breadcrumb bar to `style.css`
- **Files:** `frontend/src/components/Breadcrumbs.jsx`, `frontend/src/App.jsx`, `frontend/src/style.css`

**9. Housekeeping & integration** [after 5, 6, 7, 8]
- Add `.vite/` to `.gitignore`
- Update `README.md` with Phase 2 features, new keyboard shortcuts, updated project structure
- Update `frontend/package.json` — ensure all new deps are listed
- Run `go mod tidy` to clean up Go dependencies
- Run full test suite: `go test ./backend/... -count=1`
- Run frontend build: `cd frontend && npm run build`
- **Files:** `.gitignore`, `README.md`, `frontend/package.json`, `go.mod`, `go.sum`

### Testing

- **Task 1 (Terminal backend):** Unit tests for CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal, ListTerminals, double-close error, write-to-closed error. Integration test: spawn `echo hello`, verify output contains "hello".
- **Task 2 (Search backend):** Unit tests for rg arg building from SearchOptions, JSON output parsing, CancelSearch. Integration test: create temp directory with known files, run Search, verify correct results. Test regex, case-insensitive, whole-word, glob filters.
- **Task 3 (Settings backend):** Unit tests for new fields in UpdateSetting, workspace settings load/save/merge, GetSettingsSchema returns all fields, precedence chain (workspace overrides user overrides default).
- **Task 4 (Wiring):** Verify `go build` succeeds with all new services bound. Verify `npm run build` succeeds.
- **Task 5 (Terminal frontend):** UI test: open terminal panel, verify xterm.js renders, type command, verify output appears. Test multiple terminals, close terminal.
- **Task 6 (Search frontend):** UI test: open search panel, type query, verify results appear grouped by file. Test regex toggle, case sensitivity toggle. Click result opens file.
- **Task 7 (Settings frontend):** UI test: open settings panel, verify settings list renders, change a setting, verify it persists. Test search filter.
- **Task 8 (Breadcrumbs):** UI test: open a file, verify breadcrumb bar shows path segments. Verify sticky scroll is enabled.
- **Task 9 (Integration):** Full build passes (`go test`, `npm run build`, `wails build`). All existing Phase 1 tests still pass.

### Files to Modify

**New files:**
- `backend/terminal/service.go` — PTY terminal service
- `backend/terminal/service_test.go` — terminal service tests
- `backend/search/service.go` — ripgrep search service
- `backend/search/service_test.go` — search service tests
- `frontend/src/components/Terminal.jsx` — xterm.js wrapper
- `frontend/src/components/TerminalPanel.jsx` — multi-terminal panel with tabs
- `frontend/src/components/SearchPanel.jsx` — search sidebar UI
- `frontend/src/components/SettingsEditor.jsx` — searchable settings UI
- `frontend/src/components/Breadcrumbs.jsx` — breadcrumb navigation bar
- `frontend/src/contexts/TerminalContext.jsx` — terminal state management
- `frontend/src/contexts/SettingsContext.jsx` — settings state management

**Modified files:**
- `main.go` — bind new services
- `app.go` — pass context to new services
- `backend/settings/service.go` — new fields, workspace settings, schema
- `backend/settings/service_test.go` — tests for new functionality
- `frontend/package.json` — add xterm, @xterm/addon-fit, @xterm/addon-webgl
- `frontend/src/App.jsx` — add terminal panel, breadcrumbs, new contexts, new commands
- `frontend/src/components/Sidebar.jsx` — replace search/settings placeholders with real components
- `frontend/src/components/EditorPane.jsx` — read settings, apply to Monaco
- `frontend/src/components/StatusBar.jsx` — show terminal count, search result count
- `frontend/src/utils/wails.js` — add getWailsTerminal, getWailsSearch, getWailsSettings helpers
- `frontend/src/style.css` — styles for terminal, search, settings, breadcrumbs
- `.gitignore` — add .vite/
- `README.md` — Phase 2 features
- `go.mod` / `go.sum` — new dependencies
