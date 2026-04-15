package main

import (
	"bolt/backend/fs"
	"context"
)

// App struct manages the application lifecycle.
type App struct {
	ctx       context.Context
	fsService *fs.Service
}

// NewApp creates a new App instance.
func NewApp(fsService *fs.Service) *App {
	return &App{
		fsService: fsService,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the Wails runtime methods.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Pass context to services that need native dialog access
	a.fsService.SetContext(ctx)
}

// shutdown is called when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	// Cleanup resources here
}
