.PHONY: dev build-linux build-darwin build-windows clean test

# Development (Linux with webkit2gtk-4.1)
dev:
	wails dev -tags webkit2_41

# Production builds
build-linux:
	wails build -tags webkit2_41

build-darwin:
	wails build

build-windows:
	wails build

# Run Go tests
test:
	go test ./backend/... -v

# Clean build artifacts
clean:
	rm -rf build/bin
	rm -rf frontend/dist
