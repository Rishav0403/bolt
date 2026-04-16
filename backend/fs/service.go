package fs

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// Service provides file system operations exposed to the frontend via Wails bindings.
type Service struct {
	ctx context.Context
}

// NewService creates a new file system service.
func NewService() *Service {
	return &Service{}
}

// SetContext stores the Wails runtime context, required for native dialogs.
// Must be called from the app's OnStartup hook.
func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// OpenFolderDialog opens a native directory picker dialog and returns the selected path.
// Returns an empty string if the user cancels.
func (s *Service) OpenFolderDialog() (string, error) {
	return wailsruntime.OpenDirectoryDialog(s.ctx, wailsruntime.OpenDialogOptions{
		Title: "Open Folder",
	})
}

// ListDir returns the directory tree for the given path (one level deep).
// Directories are listed first, then files, both sorted alphabetically.
func (s *Service) ListDir(path string) ([]FileEntry, error) {
	path = filepath.Clean(path)

	result, err := s.buildEntries(path)
	if err != nil {
		return nil, err
	}

	// For directories, load one level of children so the tree can show expand arrows
	for i := range result {
		if result[i].IsDir {
			children, err := s.buildEntries(result[i].Path)
			if err == nil {
				result[i].Children = children
			}
		}
	}

	return result, nil
}

// buildEntries reads directory entries, filters hidden files, constructs FileEntry structs,
// and returns them sorted (directories first, then alphabetically).
func (s *Service) buildEntries(path string) ([]FileEntry, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var result []FileEntry
	for _, entry := range entries {
		name := entry.Name()
		// Skip hidden files/directories
		if strings.HasPrefix(name, ".") {
			continue
		}

		fullPath := filepath.Join(path, name)
		fe := FileEntry{
			Name:  name,
			Path:  fullPath,
			IsDir: entry.IsDir(),
		}

		if !entry.IsDir() {
			fe.Extension = strings.TrimPrefix(filepath.Ext(name), ".")
		}

		result = append(result, fe)
	}

	// Sort: directories first, then files, alphabetically within each group
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})

	return result, nil
}

// ReadFile reads and returns the contents of a file as a string.
func (s *Service) ReadFile(path string) (string, error) {
	path = filepath.Clean(path)
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFile writes content to a file, creating it if it doesn't exist.
func (s *Service) WriteFile(path string, content string) error {
	path = filepath.Clean(path)
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// CreateFile creates a new empty file at the given path.
// Returns an error if a file already exists at that path to prevent accidental overwrites.
func (s *Service) CreateFile(path string) error {
	path = filepath.Clean(path)
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("file already exists: %s", path)
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return err
	}
	return f.Close()
}

// CreateDir creates a new directory at the given path.
func (s *Service) CreateDir(path string) error {
	path = filepath.Clean(path)
	return os.MkdirAll(path, 0755)
}

// DeletePath deletes a file or directory at the given path.
func (s *Service) DeletePath(path string) error {
	path = filepath.Clean(path)
	return os.RemoveAll(path)
}

// RenamePath renames/moves a file or directory.
// Returns an error if the destination already exists to prevent accidental overwrites.
func (s *Service) RenamePath(oldPath string, newPath string) error {
	oldPath = filepath.Clean(oldPath)
	newPath = filepath.Clean(newPath)
	if _, err := os.Stat(newPath); err == nil {
		return fmt.Errorf("destination already exists: %s", newPath)
	}
	return os.Rename(oldPath, newPath)
}

// ListAllFiles recursively walks the directory tree and returns a flat list of
// relative file paths, skipping hidden directories and common non-project dirs.
func (s *Service) ListAllFiles(rootPath string) ([]string, error) {
	rootPath = filepath.Clean(rootPath)
	var files []string

	skipDirs := map[string]bool{
		".git": true, "node_modules": true, ".bolt": true,
		"vendor": true, "__pycache__": true, ".next": true,
		"dist": true, "build": true,
	}

	err := filepath.WalkDir(rootPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}
		name := d.Name()
		if d.IsDir() {
			if strings.HasPrefix(name, ".") && path != rootPath {
				return filepath.SkipDir
			}
			if skipDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}
		rel, err := filepath.Rel(rootPath, path)
		if err != nil {
			return nil
		}
		files = append(files, rel)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}
