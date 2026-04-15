# Phase 3 — UI Overhaul + Git Integration

### Summary

The current UI is functional but visually immature (flat design, only 2 shadows and 3 transitions in 1100+ lines of CSS, 30+ hardcoded colors, inconsistent spacing, no focus rings). Phase 3 prioritizes a comprehensive visual overhaul to make the editor look professional, then adds Git integration as the key new feature. The approach: establish a design system with CSS custom properties, then systematically apply it to every component.

### Tasks

**1. Design System Foundation — CSS custom properties & global resets** [parallel]

Add to `:root` in `style.css`:
- Spacing scale: `--space-xs` (2px), `--space-sm` (4px), `--space-md` (8px), `--space-lg` (12px), `--space-xl` (16px), `--space-2xl` (24px), `--space-3xl` (32px)
- Shadow scale: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg` (dark theme appropriate — heavier opacity than light themes)
- Border radius: `--radius-sm` (2px), `--radius-md` (4px), `--radius-lg` (6px), `--radius-xl` (8px)
- Transition tokens: `--transition-fast` (120ms ease-out), `--transition-base` (200ms ease), `--transition-slow` (300ms ease-in-out)
- Typography: `--text-xs` (10px), `--text-sm` (11px), `--text-base` (13px), `--text-lg` (14px), `--text-xl` (16px), `--text-2xl` (20px)
- Focus ring: `--focus-ring-color` (rgba(0,122,204,0.4)), `--focus-ring` (0 0 0 2px var(--focus-ring-color))
- Fix contrast: bump `--text-muted` from `#6a6a6a` to `#858585` (passes WCAG AA on #1e1e1e)
- Add global focus-visible rules for buttons, inputs, selects, [tabindex], [role="button"]
- Add global disabled state rules (opacity 0.5, cursor not-allowed)
- Add `::selection` color (already exists, keep)
- Add keyframe animations: `@keyframes fadeIn`, `@keyframes slideDown`, `@keyframes scaleIn`

**2. Activity Bar & Sidebar polish** [parallel]

File: `style.css` — activity bar section (lines ~119-170) and sidebar section (lines ~171-226)

Activity bar:
- Add `transition: all var(--transition-fast)` (replace `transition: color 0.1s`)
- Add `border-radius: var(--radius-md)` to items
- Hover: add subtle `background: rgba(255,255,255,0.06)` 
- Active indicator: increase width from 2px to 2.5px, use `var(--accent)` color instead of `--text-bright`
- Active item: add faint `background: rgba(0,122,204,0.08)`

Sidebar:
- Sidebar header: increase height from 35px to 36px, add `border-bottom: 1px solid var(--border)`
- Sidebar title: use `--text-sm` (11px), `font-weight: 600`
- Placeholder views: add subtle icon animation (pulse), improve spacing

**3. Tab Bar & Breadcrumbs polish** [parallel]

File: `style.css` — tab bar section (lines ~228-332) and breadcrumbs section (lines ~1039-1094)

Tab bar:
- Add `transition: all var(--transition-fast)` to `.tab`
- Active tab: change top border from 1px to 2px, use `border-top` instead of `::after` pseudo-element for cleaner code
- Tab hover: add `color: var(--text-primary)` alongside background change
- Tab close button: increase size from 20px to 22px, add `transition: all var(--transition-fast)`, add hover `background: rgba(255,255,255,0.1)` and active `transform: scale(0.9)`
- Tab modified dot: reduce to 6px, use `var(--accent)` color instead of text-primary
- Add subtle `box-shadow: inset 0 -1px 0 var(--border)` to tab-bar for depth

Breadcrumbs:
- Replace hardcoded `#1e1e1e` with `var(--bg-primary)`, `#2a2a2a` with `var(--border)`, `#999` with `var(--text-secondary)`, `#ccc` with `var(--text-primary)`, `#555` with `var(--text-muted)`, `#dcdcaa` with a new `--breadcrumb-symbol` variable
- Add `transition: all var(--transition-fast)` to segments (replace existing 0.15s)

**4. Terminal Panel polish** [parallel]

File: `style.css` — terminal section (lines ~659-789)

- Replace ALL hardcoded colors with CSS variables: `#1e1e1e` → `var(--bg-primary)`, `#252526` → `var(--bg-secondary)`, `#333` → `var(--border)`, `#007acc` → `var(--accent)`, `#ccc` → `var(--text-primary)`, `#999` → `var(--text-secondary)`, `#fff` → `var(--text-bright)`, `#2a2d2e` → `var(--bg-hover)`, `#37373d` → `var(--bg-active)`, `#555` → `var(--bg-input)`
- Resize handle: increase height from 4px to 5px, add `transition: background var(--transition-fast)`, add a subtle center grip indicator (3 dots or a thin line) using `::after` pseudo-element
- Terminal panel header: add `box-shadow: var(--shadow-xs)` for depth separation
- Terminal tabs: add `transition: all var(--transition-fast)`
- Action buttons: add `transition: all var(--transition-fast)`, add `border-radius: var(--radius-md)`

**5. Search Panel polish** [parallel]

File: `style.css` — search section (lines ~790-1037)

- Replace ALL hardcoded colors with CSS variables (same mapping as Task 4)
- Search input wrapper: add `transition: border-color var(--transition-fast), box-shadow var(--transition-fast)`, add `box-shadow: var(--shadow-xs)` on focus-within
- Search toggle buttons: add `transition: all var(--transition-fast)`
- Search results: add subtle left border accent on hover (`border-left: 2px solid var(--accent)`)
- Search highlight: keep `#613214` background but add subtle `box-shadow: 0 0 0 1px rgba(240,160,80,0.3)` for better visibility
- File headers: add `transition: background var(--transition-fast)`
- Result count badge: use CSS variables for colors
- Replace button: add `transition: all var(--transition-fast)`

**6. Settings Editor polish** [after 1]

File: `settings-styles.css` — entire file

- Replace ALL hardcoded colors with CSS variables: `#333` → `var(--border)`, `#999` → `var(--text-secondary)`, `#ccc` → `var(--text-primary)`, `#fff` → `var(--text-bright)`, `#007acc` → `var(--accent)`, `#3c3c3c` → `var(--bg-input)`, `#555` → border color variable, `#777` → `var(--text-muted)`, `#2a2a2a` → darker border, `#4fc1ff` → `var(--info)`, `#666` → `var(--text-muted)`
- Scope tabs: add `transition: all var(--transition-fast)`, increase padding from 8px to 10px
- Settings items: add `transition: background var(--transition-fast)`, add hover background
- Input controls: add `transition: all var(--transition-fast)`, add focus `box-shadow`
- Checkbox: style with custom appearance (square with rounded corners, accent check)
- Add subtle separator styling between items

**7. Command Palette & Context Menu polish** [after 1]

File: `style.css` — command palette section (lines ~560-657) and context menu section (lines ~457-504)

Command palette:
- Add `animation: slideDown var(--transition-slow) ease-out` for entrance
- Add backdrop: `.command-palette-overlay { background: rgba(0,0,0,0.3); backdrop-filter: blur(2px); }`
- Input wrapper: increase padding from `8px 12px` to `10px 14px`
- Items: add `transition: background var(--transition-fast), color var(--transition-fast)`
- Selected item: use softer highlight — `background: var(--bg-active)` with left accent border instead of full `var(--accent)` background (VS Code style)
- Empty state: add subtle icon

Context menu:
- Add `animation: scaleIn 120ms ease-out` for entrance
- Add `transform-origin: top left`
- Items: add `transition: background var(--transition-fast)`
- Increase item padding from `4px 24px` to `6px 20px` for better click targets
- Selected item: use `background: var(--bg-active)` instead of full accent (match command palette)

**8. Welcome Screen & Empty States polish** [after 1]

File: `style.css` — editor welcome section (lines ~506-558) and sidebar placeholder

- Welcome screen: add subtle gradient background, improve logo animation (gentle float/pulse)
- Shortcut rows: add hover effect, increase gap, add subtle divider between rows
- kbd elements: add `box-shadow: 0 1px 0 var(--border)` for 3D key effect, add `transition: all var(--transition-fast)`, hover lift effect
- Sidebar placeholders: add fade-in animation, improve icon styling
- "No file open" tab bar text: style with muted italic

**9. Git Integration Backend** [parallel]

New file: `backend/git/service.go`, `backend/git/service_test.go`

Service struct with methods (shell out to `git` binary, similar pattern to `search.Service`):
- `GetStatus(rootPath string) ([]FileStatus, error)` — runs `git status --porcelain=v2` and parses output into `FileStatus` structs with `Path`, `Status` (modified/added/deleted/renamed/untracked), `Staged` bool
- `GetBranch(rootPath string) (BranchInfo, error)` — runs `git branch --show-current` + `git rev-parse --short HEAD` → returns `BranchInfo{Name, Commit, Ahead, Behind}`
- `GetDiff(rootPath string, filePath string) (string, error)` — runs `git diff -- <file>` for unstaged, `git diff --cached -- <file>` for staged
- `StageFile(rootPath, filePath string) error` — runs `git add <file>`
- `UnstageFile(rootPath, filePath string) error` — runs `git reset HEAD -- <file>`
- `Commit(rootPath, message string) error` — runs `git commit -m <message>`
- `GetLog(rootPath string, limit int) ([]LogEntry, error)` — runs `git log --oneline -<limit> --format="%H|%h|%s|%an|%ar"` → parses into `LogEntry{Hash, ShortHash, Message, Author, RelativeTime}`

Types: `FileStatus`, `BranchInfo`, `LogEntry`

Tests: table-driven tests using a temp git repo (init, add, commit, modify, check status/diff/log). Follow pattern from `backend/search/service_test.go`.

Wire into `main.go` and `app.go` (bind + SetContext). Add `getWailsGit()` helper in `frontend/src/utils/wails.js`.

**10. Git Integration Frontend** [after 9]

New files: `frontend/src/components/GitPanel.jsx`, `frontend/src/contexts/GitContext.jsx`

`GitContext.jsx`:
- Signals: `branch()`, `status()` (array of FileStatus), `loading()`, `error()`
- Auto-refresh on rootPath change and on 5-second interval (when panel is visible)
- Methods: `refresh()`, `stageFile(path)`, `unstageFile(path)`, `commit(message)`, `stageAll()`, `unstageAll()`
- Demo mode: return mock data (3 modified files, 1 untracked, branch "main")

`GitPanel.jsx`:
- Branch display at top with commit hash
- Commit input (textarea) with "Commit" button (disabled when message empty or no staged files)
- Two collapsible sections: "Staged Changes" and "Changes" (unstaged)
- Each file row: status icon (M/A/D/U with color coding — green for staged, orange for modified, red for deleted, gray for untracked), file name, stage/unstage button (+/- icon) on hover
- Click file → open diff view (stretch goal: just open the file for now)
- Empty state when no changes: "No changes detected" with checkmark icon
- Loading state: subtle spinner
- All styled using CSS variables from Task 1, matching the polished look

Update `Sidebar.jsx`: replace Git placeholder with `<GitPanel rootPath={props.rootPath} />`
Update `StatusBar.jsx`: show actual branch name from GitContext (instead of hardcoded "main"), show file change count badge
Wrap `AppInner` with `GitProvider` in `App.jsx`

### Testing

- **Task 1**: Verify CSS variables are defined, no syntax errors, `npm run build` passes
- **Tasks 2-8**: Visual regression — start dev server, screenshot each component, compare before/after
- **Task 9**: Go unit tests — init temp repo, test all 7 methods, test error cases (not a git repo, no commits)
- **Task 10**: Demo mode renders GitPanel with mock data, stage/unstage toggles work, commit button enables/disables correctly
- **All**: `go build ./...` passes, `npm run build` passes, `go test ./backend/... -count=1` all pass

### Files to Modify

**New files:**
- `backend/git/service.go` — Git backend service
- `backend/git/service_test.go` — Git backend tests
- `frontend/src/components/GitPanel.jsx` — Git source control panel
- `frontend/src/contexts/GitContext.jsx` — Git state management

**Modified files:**
- `frontend/src/style.css` — Design system tokens + polish for all components (~300 lines changed)
- `frontend/src/settings-styles.css` — Replace hardcoded colors, add transitions (~60 lines changed)
- `frontend/src/App.jsx` — Add GitProvider wrapper
- `frontend/src/components/Sidebar.jsx` — Replace Git placeholder with GitPanel
- `frontend/src/components/StatusBar.jsx` — Dynamic branch name + change count from GitContext
- `frontend/src/utils/wails.js` — Add getWailsGit() helper
- `main.go` — Import and bind git.Service
- `app.go` — Store git service, call SetContext
- `README.md` — Update with Phase 3 features
