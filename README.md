# Bolt Editor

A blazing-fast, VS Code-inspired desktop code editor built with **Wails v2** (Go backend + native webview), **React**, and **Monaco Editor**.

## Why Bolt?

| Metric | VS Code | Bolt Target |
|--------|---------|-------------|
| Binary size | ~350MB | < 50MB |
| RAM (idle) | 300-500MB | < 100MB |
| Cold startup | ~2-4s | < 500ms |

Bolt uses the system's native webview instead of bundling Chromium, resulting in dramatically smaller binaries and lower memory usage.

## Architecture

```
┌─────────────────────────────────────────────┐
│ Wails Shell                                 │
│ ┌─────────────────┐ ┌────────────────────┐  │
│ │ Go Backend      │ │ WebView Frontend   │  │
│ │ - File System   │◄►│ - Monaco Editor   │  │
│ │ - Settings      │ │ - React UI         │  │
│ │ - (LSP, Git...) │ │ - Command Palette  │  │
│ └─────────────────┘ └────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Features (Phase 1)

- Monaco Editor with multi-tab support
- File explorer with tree view
- Command palette (Ctrl+Shift+P)
- Dark theme (VS Code Dark+ inspired)
- Cross-platform (macOS, Linux, Windows)

## Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails v2](https://wails.io/docs/gettingstarted/installation)
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
make test
```

## Project Structure

```
bolt/
├── main.go              # Wails app entry point
├── app.go               # App lifecycle
├── backend/
│   ├── fs/              # File system service
│   └── settings/        # Settings service
├── frontend/
│   └── src/
│       ├── components/  # React components
│       ├── contexts/    # React contexts (state)
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
| Ctrl+Tab | Switch Tab |

## License

MIT
