package main

import (
	"embed"

	"bolt/backend/fs"
	"bolt/backend/git"
	"bolt/backend/search"
	"bolt/backend/settings"
	"bolt/backend/terminal"
	"bolt/backend/textbuffer"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	fsService := fs.NewService()
	settingsService := settings.NewService()
	textBufferService := textbuffer.NewService()
	terminalService := terminal.NewService()
	searchService := search.NewService()
	gitService := git.NewService()
	app := NewApp(fsService, terminalService, searchService, gitService)

	err := wails.Run(&options.App{
		Title:     "Bolt",
		Width:     1280,
		Height:    800,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 30, G: 30, B: 30, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
			fsService,
			settingsService,
			textBufferService,
			terminalService,
			searchService,
			gitService,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
