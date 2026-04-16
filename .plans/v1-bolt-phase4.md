### Summary
Phase 4 adds advanced editor capabilities and developer productivity features: split editor panes, Git diff viewer (leveraging existing `GetDiff` backend), live cursor position tracking, quick file open (Ctrl+P), commit history viewer (leveraging existing `GetLog` backend), and a keyboard shortcuts reference panel. The backend already has `GetDiff()` and `GetLog()` implemented but unused — Phase 4 is primarily frontend work.

### Tasks

1. [parallel] **Live Cursor Position in Status Bar**
   - Listen to Monaco `onDidChangeCursorPosition` in `EditorPane.jsx`
   - Add `cursorPosition` signal to `EditorContext.jsx` (line, column, selection count)
   - Update `StatusBar.jsx` to show dynamic "Ln X, Col Y" instead of hardcoded "Ln 1, Col 1"
   - Show selection info when text is selected: "Ln X, Col Y (N selected)"
   - Add "Go to Line" command (Ctrl+G) that opens an input dialog and navigates to the line
   - Follow existing signal patterns in `EditorContext.jsx`

2. [parallel] **Quick File Open (Ctrl+P)**
   - Add `ListAllFiles(rootPath string) ([]string, error)` to `backend/fs/service.go` — recursively walks the directory tree using `filepath.WalkDir`, skips hidden dirs (`.git`, `node_modules`, `.bolt`), returns flat list of relative file paths. Add unit test in `backend/fs/service_test.go`.
   - Create `frontend/src/components/QuickFileOpen.jsx` — modal overlay similar to CommandPalette
   - Implement fuzzy filename matching (simple substring + scoring, no external library)
   - Fetch file list from backend `fs.ListAllFiles(rootPath)`, cache in context
   - Keyboard navigation: arrow keys to select, Enter to open, Escape to close
   - Show file path in muted text next to filename
   - Register Ctrl+P keybinding in `App.jsx` via `CommandContext`
   - Style using existing design tokens (reuse `.command-palette` CSS patterns)

3. [parallel] **Git Branch Management Backend**
   - Add to `backend/git/service.go`:
     - `ListBranches(rootPath string)` — returns `[]BranchListEntry{Name, IsCurrent, IsRemote, LastCommit}`
     - `CheckoutBranch(rootPath, branchName string)` — runs `git checkout <branch>`
     - `CreateBranch(rootPath, branchName string)` — runs `git checkout -b <branch>`
     - `DeleteBranch(rootPath, branchName string)` — runs `git branch -d <branch>`
   - Add unit tests for each method in `backend/git/service_test.go`
   - Follow existing patterns: `runGit()` helper, `sync.Mutex` locking, context-aware commands

4. [parallel] **Split Editor Panes**
   - Refactor `EditorPane.jsx` to support multiple panes (horizontal split)
   - Add `SplitEditorContext.jsx` or extend `EditorContext.jsx` with:
     - `panes` signal — array of pane objects, each with its own tab list and active tab
     - `activePaneIndex` signal
     - `splitPane()`, `closePane()`, `moveTabToPane()` methods
   - Add "Split Editor Right" command (Ctrl+\\) in `App.jsx`
   - Render panes side-by-side with a draggable resize handle between them (reuse terminal resize pattern)
   - Each pane has its own TabBar and Monaco editor instance
   - Route file opens to the active pane
   - Add CSS for `.editor-split-container`, `.editor-pane`, `.editor-resize-handle` using design tokens

5. [after 4, 6] **Diff Viewer**
   - Add `GetFileAtRevision(rootPath, filePath, revision string) (string, error)` to `backend/git/service.go` — runs `git show <revision>:<filePath>` to get file content at a specific revision (e.g., "HEAD"). Returns empty string for new/untracked files. Add unit test.
   - Create `frontend/src/components/DiffViewer.jsx`
   - Use Monaco's `createDiffEditor()` API for side-by-side diff display — this needs the full original and modified file content as two separate strings (NOT a unified diff)
   - In `GitPanel.jsx`, add a click handler on file rows that opens the diff:
     - For unstaged files: fetch original via `git.GetFileAtRevision(rootPath, filePath, "HEAD")`, fetch modified via `fs.ReadFile(absolutePath)` where absolutePath is the full path to the file on disk (the backend `ReadFile` takes an absolute path, not relative)
     - For staged files: fetch original via `git.GetFileAtRevision(rootPath, filePath, "HEAD")`, fetch staged via `git.GetFileAtRevision(rootPath, filePath, ":0")` (index version using `:0` revision syntax)
   - Open in a split pane: left = original (from HEAD), right = modified
   - Add diff-specific CSS: green/red line backgrounds, gutter indicators
   - Add "Next Change" / "Previous Change" navigation buttons

6. [after 3] **Git Branch Management Frontend + Commit History Viewer**
   - **Branch Management:**
     - Add "BRANCHES" collapsible section to `GitPanel.jsx` (below staged/unstaged sections)
     - Show list of local branches with current branch highlighted
     - Click branch to checkout (with confirmation if there are uncommitted changes)
     - "New Branch" button that shows an input field for branch name
     - Delete branch via icon button (with confirmation dialog)
   - **Commit History:**
     - Add "COMMIT HISTORY" collapsible section to `GitPanel.jsx` (below branches)
     - Call `git.GetLog(rootPath, 50)` to fetch recent commits
     - Display each commit as a row: short hash (monospace, muted), message, author, relative time
     - "Load More" button for pagination
   - **Shared context updates in `GitContext.jsx`:**
     - Add `branches` signal, `listBranches()`, `checkoutBranch()`, `createBranch()`, `deleteBranch()` methods
     - Add `log` signal and `fetchLog()` method
     - Refresh branches and log on rootPath change and after branch/commit operations
   - Style using design tokens, follow existing collapsible section pattern from staged/unstaged
   - **NOTE:** These are combined into one task because both modify `GitPanel.jsx` and `GitContext.jsx` — running them as separate parallel agents would cause file conflicts.

7. [parallel] **Keyboard Shortcuts Reference Panel**
   - Create `frontend/src/components/KeyboardShortcutsPanel.jsx`
   - Collect all registered commands from `CommandContext` with their keybindings
   - Display in a searchable, categorized table (Editor, File, Git, Terminal, Navigation)
   - Each row: Command name, Keybinding (styled as `<kbd>` elements), Category
   - Search input at top to filter by command name
   - Register "Keyboard Shortcuts" command (Ctrl+K Ctrl+S) in `App.jsx`
   - Open as a full-width panel in the editor area (like Settings)
   - Reuse settings-styles.css patterns for the table layout

### Testing

- **Task 1**: Verify cursor position updates when clicking in editor, typing, selecting text. Check "Go to Line" dialog works.
- **Task 2**: Verify Ctrl+P opens modal, typing filters files, arrow keys navigate, Enter opens file, Escape closes. Verify `ListAllFiles` backend test passes.
- **Task 3**: Run `go test ./backend/git/... -count=1 -v` — all new branch management tests pass.
- **Task 4**: Verify Ctrl+\\ splits editor, both panes show independent tabs, resize handle works, closing pane restores single view.
- **Task 5**: Click a modified file in Git panel, verify diff viewer opens showing original vs modified side-by-side using Monaco diff editor.
- **Task 6**: Verify branch list shows in Git panel, checkout switches branch, new branch creates, delete removes. Verify commit history loads with correct data and "Load More" works.
- **Task 7**: Verify Ctrl+K Ctrl+S opens shortcuts panel, search filters correctly.
- **Integration**: Full `npx vite build` succeeds. All `go test ./backend/... -count=1` pass. UI walkthrough of all new features.

### Post-Build Verification (CRITICAL)
Multiple tasks add CSS to `style.css` and register keybindings in `App.jsx`. After ALL build agents complete, an explore subagent MUST verify that `style.css` and `App.jsx` contain changes from ALL tasks. If any agent's changes were overwritten by a later agent, re-apply the missing changes before proceeding to the quality loop. Run `git diff style.css` and `git diff App.jsx` to confirm all expected sections are present.

### Files to Modify
- `frontend/src/components/EditorPane.jsx` — split pane support, cursor tracking
- `frontend/src/contexts/EditorContext.jsx` — cursor position signal, pane management
- `frontend/src/components/StatusBar.jsx` — dynamic cursor position display
- `frontend/src/components/GitPanel.jsx` — diff click handler, branches section, commit history section
- `frontend/src/contexts/GitContext.jsx` — branches signal, log signal, new methods
- `frontend/src/App.jsx` — new keybindings (Ctrl+P, Ctrl+G, Ctrl+\\, Ctrl+K Ctrl+S)
- `frontend/src/style.css` — split editor, diff viewer, quick open, shortcuts panel CSS
- `backend/fs/service.go` — ListAllFiles recursive method
- `backend/fs/service_test.go` — ListAllFiles tests
- `backend/git/service.go` — branch management methods
- `backend/git/service_test.go` — branch management tests
- `frontend/src/components/QuickFileOpen.jsx` — **new**
- `frontend/src/components/DiffViewer.jsx` — **new**
- `frontend/src/components/KeyboardShortcutsPanel.jsx` — **new**
