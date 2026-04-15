# Bolt Editor

A blazing-fast, VS Code-inspired desktop code editor built with **Wails v2** (Go backend + native webview), **SolidJS**, and **Monaco Editor**.

## Why Bolt?

| Metric | VS Code | Bolt Target |
|--------|---------|-------------|
| Binary size | ~350MB | < 50MB |
| RAM (idle) | 300-500MB | < 100MB |
| Cold startup | ~2-4s | < 500ms |

Bolt uses the system's native webview instead of bundling Chromium, resulting in dramatically smaller binaries and lower memory usage. SolidJS provides fine-grained reactivity with no Virtual DOM overhead, making the editor feel snappy even with large files.

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Wails Shell                                      │
│ ┌──────────────────┐ ┌────────────────────────┐  │
│ │ Go Backend       │ │ WebView Frontend       │  │
│ │ - File System    │◄►│ - Monaco Editor       │  │
│ │ - Terminal (PTY) │ │ - SolidJS UI           │  │
│ │ - Search (rg)    │ │ - Command Palette      │  │
│ │ - Settings       │ │ - Integrated Terminal  │  │
│ │ - Text Buffer    │ │ - Project-Wide Search  │  │
│ └──────────────────┘ └────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Features

### Phase 1 — Core Editor
- Monaco Editor with multi-tab support and piece-table text buffer
- File explorer with tree view
- Command palette (Ctrl+Shift+P)
- Dark theme (VS Code Dark+ inspired)
- Cross-platform (macOS, Linux, Windows)

### Phase 2 — Productivity
- **Integrated Terminal** — PTY-backed terminal via `creack/pty`, xterm.js with WebGL renderer, multiple instances with tab management, draggable resize handle
- **Project-Wide Search** — ripgrep (`rg`) powered search with regex, case-sensitive, and whole-word toggles, include/exclude glob filters, find-and-replace, results grouped by file with match highlighting
- **Workspace & Settings** — 3-tier settings precedence (default → user → workspace), `.bolt/settings.json` workspace config, searchable settings editor UI with User/Workspace scope tabs
- **Minimap & Breadcrumbs** — Monaco minimap wired to settings, breadcrumb navigation bar with file path segments, sticky scroll support

## Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails v2](https://wails.io/docs/gettingstarted/installation)
- [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) — for project-wide search
- **Linux:** `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`
- **macOS:** Xcode command line tools
- **Windows:** WebView2 runtime (included in Windows 11)

## Development

```bash
# Linux (requires webkit2_41 build tag)
make dev

# macOS / Windows
wails dev
```

## Building

```bash
# Linux
make build-linux

# macOS
make build-darwin

# Windows
make build-windows
```

## Running Tests

```bash
# Go backend tests
make test
# or directly:
go test ./backend/... -count=1

# Frontend build check
cd frontend && npm run build
```

## Project Structure

```
bolt/
├── main.go              # Wails app entry point
├── app.go               # App lifecycle
├── backend/
│   ├── fs/              # File system service
│   ├── settings/        # Settings service (user + workspace)
│   ├── terminal/        # PTY terminal service
│   ├── search/          # Ripgrep search service
│   └── textbuffer/      # Piece-table text buffer
├── frontend/
│   └── src/
│       ├── components/  # SolidJS components
│       │   ├── ActivityBar.jsx
│       │   ├── Breadcrumbs.jsx
│       │   ├── CommandPalette.jsx
│       │   ├── EditorPane.jsx
│       │   ├── FileExplorer.jsx
│       │   ├── SearchPanel.jsx
│       │   ├── SettingsEditor.jsx
│       │   ├── Sidebar.jsx
│       │   ├── StatusBar.jsx
│       │   ├── TabBar.jsx
│       │   ├── Terminal.jsx
│       │   └── TerminalPanel.jsx
│       ├── contexts/    # SolidJS contexts (state)
│       │   ├── CommandContext.jsx
│       │   ├── EditorContext.jsx
│       │   ├── SettingsContext.jsx
│       │   └── TerminalContext.jsx
│       ├── utils/       # Helpers
│       └── style.css    # Global styles
└── Makefile             # Build commands
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+P | Command Palette |
| Ctrl+S | Save File |
| Ctrl+W | Close Tab |
| Ctrl+B | Toggle Sidebar |
| Ctrl+O | Open Folder |
| Ctrl+Shift+E | Show Explorer |
| Ctrl+Shift+F | Show Search |
| Ctrl+Shift+G | Show Source Control |
| Ctrl+Shift+X | Show Extensions |
| Ctrl+` | Toggle Terminal |
| Ctrl+Tab | Switch Tab |

## License

MIT
