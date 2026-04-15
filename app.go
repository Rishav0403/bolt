package main

import (
	"bolt/backend/fs"
	"bolt/backend/git"
	"bolt/backend/search"
	"bolt/backend/terminal"
	"context"
)

// App struct manages the application lifecycle.
type App struct {
	ctx             context.Context
	fsService       *fs.Service
	terminalService *terminal.Service
	searchService   *search.Service
	gitService      *git.Service
}

// NewApp creates a new App instance.
func NewApp(fsService *fs.Service, terminalService *terminal.Service, searchService *search.Service, gitService *git.Service) *App {
	return &App{
		fsService:       fsService,
		terminalService: terminalService,
		searchService:   searchService,
		gitService:      gitService,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the Wails runtime methods.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Pass context to services that need native dialog access or event emission
	a.fsService.SetContext(ctx)
	a.terminalService.SetContext(ctx)
	a.searchService.SetContext(ctx)
	a.gitService.SetContext(ctx)
}

// shutdown is called when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	// Cleanup resources here
}
